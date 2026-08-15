import "./App.css";
import { ChessBoard } from "./components/ChessBoard";

function App() {
  return (
    <main className="app">
      <header className="hero">
        <p className="eyebrow">AI CHINESE CHESS</p>
        <h1>弈境</h1>
        <p className="subtitle">方寸棋盘，推演千秋</p>
      </header>

      <section className="game-layout">
        <div className="board-area">
          <div className="player-label player-label--black">
            <span className="player-dot" />
            黑方
          </div>
          <ChessBoard />
          <div className="player-label player-label--red">
            <span className="player-dot" />
            红方
          </div>
        </div>

        <aside className="game-panel">
          <p className="panel-kicker">当前对局</p>
          <h2>红方先行</h2>
          <div className="turn-card">
            <span className="turn-piece">帥</span>
            <div>
              <strong>等待落子</strong>
              <p>请选择一枚红方棋子</p>
            </div>
          </div>
          <div className="divider" />
          <dl className="game-stats">
            <div><dt>回合</dt><dd>01</dd></div>
            <div><dt>已行棋</dt><dd>0 步</dd></div>
            <div><dt>状态</dt><dd>进行中</dd></div>
          </dl>
          <p className="coming-soon">走子功能将在下一阶段开放</p>
        </aside>
      </section>
    </main>
  );
}

export default App;
