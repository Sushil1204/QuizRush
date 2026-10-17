import { useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import Decor from "../../components/Decor";
import { PageHeading } from "../../components/Headings";
import ProgressSteps from "../../components/ProgressSteps";
import NicknameInput from "../../components/NicknameInput";
import AvatarPicker from "../../components/AvatarPicker";
import OptionCard from "../../components/OptionCard";
import RoomPreviewCard from "../../components/RoomPreviewCard";
import { AVATARS } from "../../data/avatars";
import {
  DIFFICULTIES,
  QUESTION_COUNTS,
  SECONDS_OPTIONS,
  TOPICS,
  getDifficultyLabel,
  getTopicLabel,
} from "../../data/gameOptions";
import { createRoom, sanitizeNickname } from "../services/roomService";

const STEPS: string[] = ["Room Settings", "Invite Friends", "Start Game"];

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "We could not create the room. Please try again.";
}

export default function CreateRoom(): ReactElement {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string>("");
  const [avatarId, setAvatarId] = useState<string>(AVATARS[0].id);
  const [topic, setTopic] = useState<string>(TOPICS[0].id);
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[0].id);
  const [questionCount, setQuestionCount] = useState<number>(
    QUESTION_COUNTS[0],
  );
  const [secondsPerQuestion, setSeconds] = useState<number>(SECONDS_OPTIONS[1]);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const nameOk = sanitizeNickname(nickname).length > 0;

  const handleCreate = async (): Promise<void> => {
    if (creating) return;
    setError(null);
    if (!nameOk) {
      setError("Give yourself a nickname before creating the room.");
      return;
    }
    setCreating(true);
    try {
      const { room, player } = await createRoom({
        nickname: sanitizeNickname(nickname),
        avatarId,
        settings: { topic, difficulty, questionCount, secondsPerQuestion },
      });
      navigate(`/lobby/${room.code}`, {
        state: { yourPlayerId: player.id, isHost: true },
      });
    } catch (createError: unknown) {
      setError(errorMessage(createError));
      setCreating(false);
    }
  };

  return (
    <>
      <Decor variant="home" />
      <main className="qr-main qr-main--create">
        <div className="qr-container home-container">
          <div className="title-container">
            <PageHeading
              title="Create a room"
              description="Pick your settings, then share the code with the room."
            />
            <ProgressSteps steps={STEPS} current={1} />
          </div>

          <div className="qr-create-grid">
            <form
              className="qr-card qr-settings"
              onSubmit={(event: FormEvent<HTMLFormElement>) =>
                event.preventDefault()
              }
            >
              <div className="qr-settings__col qr-settings__col--player">
                <h2 className="qr-settings__title">Player</h2>

                <NicknameInput
                  id="create-nickname"
                  value={nickname}
                  onChange={(next: string) => {
                    setNickname(next);
                    setError(null);
                  }}
                  error={error ?? undefined}
                />

                <AvatarPicker
                  value={avatarId}
                  onChange={setAvatarId}
                  groupName="create-avatar"
                  columns={6}
                  columnsMobile={4}
                />
              </div>

              <div className="qr-settings__col qr-settings__col--game">
                <h2 className="qr-settings__title">Game settings</h2>

                <h3 className="qr-label qr-settings__legend">Topic</h3>
                <div className="qr-option-grid qr-option-grid--topics">
                  {TOPICS.map((item) => (
                    <OptionCard
                      key={item.id}
                      name="topic"
                      value={item.id}
                      label={item.label}
                      Icon={item.Icon}
                      checked={topic === item.id}
                      onChange={setTopic}
                    />
                  ))}
                </div>

                <h3 className="qr-label qr-settings__legend">Difficulty</h3>
                <div className="qr-option-grid qr-option-grid--tight">
                  {DIFFICULTIES.map((item) => (
                    <OptionCard
                      key={item.id}
                      name="difficulty"
                      value={item.id}
                      label={item.label}
                      checked={difficulty === item.id}
                      onChange={setDifficulty}
                    />
                  ))}
                </div>

                <h3 className="qr-label qr-settings__legend">Questions</h3>
                <div className="qr-option-grid qr-option-grid--questions">
                  {QUESTION_COUNTS.map((count) => (
                    <OptionCard
                      key={count}
                      name="question-count"
                      value={count}
                      label={String(count)}
                      checked={questionCount === count}
                      onChange={setQuestionCount}
                    />
                  ))}
                </div>

                <h3 className="qr-label qr-settings__legend">
                  Seconds per question
                </h3>
                <div className="qr-option-grid qr-option-grid--seconds">
                  {SECONDS_OPTIONS.map((seconds) => (
                    <OptionCard
                      key={seconds}
                      name="seconds"
                      value={seconds}
                      label={`${seconds}s`}
                      checked={secondsPerQuestion === seconds}
                      onChange={setSeconds}
                    />
                  ))}
                </div>
              </div>
            </form>

            <RoomPreviewCard
              nickname={nickname}
              avatarId={avatarId}
              topicLabel={getTopicLabel(topic)}
              difficultyLabel={getDifficultyLabel(difficulty)}
              questionCount={questionCount}
              secondsPerQuestion={secondsPerQuestion}
              onCreate={handleCreate}
              creating={creating}
              canCreate={!creating}
            />
          </div>
        </div>
      </main>
    </>
  );
}
