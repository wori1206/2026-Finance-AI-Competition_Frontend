import { SendButton } from "./send-button";

export default function SendButtonPreview() {
  return <div className="send-button-preview" aria-label="전송 버튼 상태 미리보기">
    <SendButton aria-label="기본" />
    <SendButton className="is-hover" aria-label="호버" />
    <SendButton className="is-focus" aria-label="포커스" />
    <SendButton className="is-active" aria-label="누름" />
    <SendButton disabled aria-label="비활성" />
    <SendButton state="loading" />
    <SendButton state="error" />
    <SendButton state="success" />
  </div>;
}
