
import './App.css';
import AudioReactivePatterns from './AudioReactivePatterns';
import AudioVisualizer from './AudioVisualizer';

function App() {
  return (
    <>
    <AudioReactivePatterns 
      audioUrl=""
      title="My OGG Track"
    />
      <AudioVisualizer
        audioUrl=""
        title="My OGG Track"
      />
    </>
  );
}

export default App;
