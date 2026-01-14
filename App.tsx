
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState } from './types';
import type { Question, Answer, TraitScore, ChatMessage, UserRole, StudentResult, NextStep, AnalysisResult } from './types';
import { getNextStep, analyzeAnswers, PERSONALITY_ARCHETYPES } from './services/geminiService';
import Button from './components/Button';
import Loader from './components/Loader';
import RadarChartComponent from './components/RadarChartComponent';

// --- Component Prop Interfaces ---

interface LoginScreenProps {
  onLogin: (passcode: string, role: 'student' | 'teacher') => boolean;
}

interface StudentNameInputScreenProps {
  onSubmit: (name: string) => void;
}

interface StartScreenProps {
  onStart: () => void;
}

interface ChatScreenProps {
  onSubmit: (answers: Answer[], skippedQuestions: Question[], improperAnswers: Question[]) => void;
}

interface ResultsScreenProps {
  results: AnalysisResult;
  onRestart?: () => void;
  studentName?: string;
  skippedQuestions: Question[];
  improperAnswers: Question[];
}

interface TeacherDashboardProps {
  onLogout: () => void;
  realStudents: StudentResult[];
}


const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [studentCode, setStudentCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [error, setError] = useState('');

  const handleLoginAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (studentCode && teacherCode) {
      setError('どちらか一方のパスコードを入力してください。');
      return;
    }

    if (studentCode) {
      const success = onLogin(studentCode, 'student');
      if (!success) setError('生徒用パスコードが正しくありません。');
    } else if (teacherCode) {
      const success = onLogin(teacherCode, 'teacher');
      if (!success) setError('教師用パスコードが正しくありません。');
    } else {
      setError('パスコードを入力してください。');
    }
  };

  return (
    <div className="text-center flex flex-col items-center space-y-8 animate-fade-in w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border border-gray-200">
      <h1 className="text-4xl font-bold tracking-tight text-gray-800">
        ログイン
      </h1>
      <form onSubmit={handleLoginAttempt} className="w-full space-y-6">
        <div>
          <label htmlFor="student-passcode" className="block text-sm font-medium text-gray-700 mb-2">
            生徒用パスコード
          </label>
          <input
            id="student-passcode"
            type="password"
            value={studentCode}
            onChange={(e) => {
              setStudentCode(e.target.value);
              if (e.target.value) setTeacherCode(''); // Clear other field
              setError('');
            }}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
            placeholder="生徒用パスコードを入力"
          />
        </div>
        <div>
          <label htmlFor="teacher-passcode" className="block text-sm font-medium text-gray-700 mb-2">
            教師用パスコード
          </label>
          <input
            id="teacher-passcode"
            type="password"
            value={teacherCode}
            onChange={(e) => {
              setTeacherCode(e.target.value);
              if (e.target.value) setStudentCode(''); // Clear other field
              setError('');
            }}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
            placeholder="教師用パスコードを入力"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <div className="pt-4">
            <Button type="submit" disabled={!studentCode && !teacherCode}>
                ログイン
            </Button>
        </div>
      </form>
    </div>
  );
};

const StudentNameInputScreen: React.FC<StudentNameInputScreenProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() === '') {
      setError('名前を入力してください。');
      return;
    }
    onSubmit(name.trim());
  };

  return (
    <div className="text-center flex flex-col items-center space-y-8 animate-fade-in w-full max-w-md p-8 bg-white rounded-xl shadow-2xl border border-gray-200">
      <h1 className="text-4xl font-bold tracking-tight text-gray-800">
        あなたの名前を教えてください
      </h1>
      <p className="text-gray-600">診断結果を保存するために使用します。</p>
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        <div>
          <label htmlFor="student-name" className="sr-only">
            生徒の名前
          </label>
          <input
            id="student-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900"
            placeholder="名前を入力"
            autoFocus
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button type="submit" disabled={!name.trim()}>
          テストを始める
        </Button>
      </form>
    </div>
  );
};


const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => (
  <div className="text-center flex flex-col items-center space-y-8 animate-fade-in">
    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">
      深層心理テスト
    </h1>
    <p className="max-w-2xl text-lg text-gray-600">
      あなたの心を探る旅へようこそ。いくつかの質問に答えるだけで、あなたの性格の隠された側面が明らかになるかもしれません。
    </p>
    <Button onClick={onStart}>診断を始める</Button>
  </div>
);

const TRAITS_ORDER: TraitScore['trait'][] = ['自己肯定感', '協調性', '倫理観', '承認欲求', '忍耐力', '感情調整力', 'ストレス耐性', '柔軟性'];

const initialStability = TRAITS_ORDER.reduce((acc, trait) => {
    acc[trait] = 0;
    return acc;
}, {} as Record<TraitScore['trait'], number>);


const ChatScreen: React.FC<ChatScreenProps> = ({ onSubmit }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<Question[]>([]);
  const [improperAnswers, setImproperAnswers] = useState<Question[]>([]);
  const [questionHistory, setQuestionHistory] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);
  
  const [scoreHistory, setScoreHistory] = useState<TraitScore[][]>([]);
  const [lastScores, setLastScores] = useState<TraitScore[] | null>(null);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [traitStability, setTraitStability] = useState<Record<TraitScore['trait'], number>>(initialStability);
  const [questionsForCurrentTrait, setQuestionsForCurrentTrait] = useState(0);
  
  const [shortAnswerStreak, setShortAnswerStreak] = useState(0);
  const [skipStreak, setSkipStreak] = useState(0);
  const questionTimestampRef = useRef<number>(0);

  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isBotTyping]);

  const STABILITY_THRESHOLD = 3;

  const processNextStep = useCallback((step: NextStep, currentAnswers: Answer[], isSkip: boolean = false) => {
    const sortedTraitScores = [...step.traitScores].sort((a, b) => a.trait.localeCompare(b.trait));
    const currentTrait = TRAITS_ORDER[currentTargetIndex];
    
    let updatedStability = { ...traitStability };
    let stabilityAchieved = false;

    if (lastScores && !isSkip) {
        const oldScoreObj = lastScores.find(s => s.trait === currentTrait);
        const newScoreObj = sortedTraitScores.find(s => s.trait === currentTrait);
        
        if (oldScoreObj && newScoreObj && Math.abs(oldScoreObj.score - newScoreObj.score) <= STABILITY_THRESHOLD) {
            updatedStability[currentTrait] += 1;
        } else {
            updatedStability[currentTrait] = 0;
        }

        // 3問は必ず質問し、4問目から安定性をチェック
        if (questionsForCurrentTrait >= 3 && updatedStability[currentTrait] >= 1) {
            stabilityAchieved = true;
        }
    } else {
        updatedStability[currentTrait] = 0; // スキップ時や初回はリセット
    }
    
    setTraitStability(updatedStability);
    setLastScores(sortedTraitScores);
    const newScoreHistory = [...scoreHistory, sortedTraitScores];
    setScoreHistory(newScoreHistory);

    const displayNewQuestion = (questionStep: NextStep, intro?: string) => {
        const newQuestion: Question = { id: Date.now(), text: questionStep.question, choices: questionStep.choices };
        setCurrentQuestion(newQuestion);
        setQuestionHistory(prev => [...prev, newQuestion]);
        
        if (intro) {
            const introMessage: ChatMessage = { id: Date.now(), text: intro, sender: 'bot' };
            setMessages(prev => [...prev, introMessage]);
        }

        setTimeout(() => {
            const nextQuestionMessage: ChatMessage = { id: Date.now() + 1, text: newQuestion.text, sender: 'bot' };
            setMessages(prev => [...prev, nextQuestionMessage]);
            questionTimestampRef.current = Date.now();
            setIsBotTyping(false);
        }, intro ? 1000 : 0);
    };

    if (stabilityAchieved) {
        const nextIndex = currentTargetIndex + 1;
        if (nextIndex >= TRAITS_ORDER.length) {
            const finalMessage: ChatMessage = {
                id: Date.now() + 1,
                text: "たくさん答えてくれてありがとう！すべての要素について、君のことがよくわかったよ。\n最終的な分析に入るから、少しだけ待っててね！",
                sender: 'bot',
            };
            setMessages(prev => [...prev, finalMessage]);
            setIsBotTyping(false);
            setCurrentQuestion(null);
            setTimeout(() => onSubmit(currentAnswers, skippedQuestions, improperAnswers), 2000);
            return;
        } else {
            setCurrentTargetIndex(nextIndex);
            setQuestionsForCurrentTrait(0); // 次の特性に進むのでカウンターをリセット
            const transitionMsgText = `ふむふむ、興味深い答えだね。ありがとう。\nよし、じゃあ次はちょっと違う角度から聞いてみようかな。`;
            
            // 次の特性の質問を取得してから表示
            getNextStep(currentAnswers, newScoreHistory, TRAITS_ORDER[nextIndex])
              .then(nextTraitStep => displayNewQuestion(nextTraitStep, transitionMsgText))
              .catch(() => {
                  const errorMessage: ChatMessage = { id: Date.now(), text: "ごめん！エラーで次の質問が作れなかった…", sender: 'bot' };
                  setMessages(prev => [...prev, errorMessage]);
                  setIsBotTyping(false);
              });
            return;
        }
    }
    
    const intro = answers.length > 1 ? (isSkip ? "オッケー！この質問は飛ばすね！" : "ありがとう！じゃあ、次の質問にいくね！") : undefined;
    displayNewQuestion(step, intro);

  }, [answers.length, currentTargetIndex, improperAnswers, lastScores, onSubmit, scoreHistory, skippedQuestions, traitStability, questionsForCurrentTrait]);


  const fetchAndProcess = useCallback(async (currentAnswers: Answer[], isSkip: boolean = false) => {
    setIsBotTyping(true);
    try {
        const currentTrait = TRAITS_ORDER[currentTargetIndex];
        const step = await getNextStep(currentAnswers, scoreHistory, currentTrait);
        processNextStep(step, currentAnswers, isSkip);
    } catch (e) {
        const errorMessage: ChatMessage = {
            id: Date.now() + 1,
            text: "ごめん！ ちょっと調子が悪いみたい…。\nエラーが発生しちゃった。少し時間をおいてから、もう一度試してみてくれるかな？",
            sender: 'bot',
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsBotTyping(false);
    }
  }, [currentTargetIndex, processNextStep, scoreHistory]);
  
  useEffect(() => {
    setIsBotTyping(true);
    getNextStep([], [], TRAITS_ORDER[0])
        .then(step => {
            const newQuestion: Question = { id: Date.now(), text: step.question, choices: step.choices };
            setCurrentQuestion(newQuestion);
            setQuestionHistory([newQuestion]);
            setQuestionsForCurrentTrait(1); // 最初の質問
            const intro = "やっほー！\n君の心の奥をこっそり探る心理テスト、始めよっか！\nいくつかの質問に答えるから、気軽に答えてみてね。\n\nじゃあ、最初の質問！";
            const firstQuestionMessage: ChatMessage = { id: Date.now() + 1, text: `${intro}\n\n${newQuestion.text}`, sender: 'bot' };
            setMessages([firstQuestionMessage]);
            questionTimestampRef.current = Date.now();
            if (step.traitScores) {
                const sortedScores = [...step.traitScores].sort((a, b) => a.trait.localeCompare(b.trait));
                setScoreHistory([sortedScores]);
                setLastScores(sortedScores);
            }
        })
        .catch(() => {
            const errorMessage: ChatMessage = { id: Date.now() + 1, text: "ごめん！ ちょっと調子が悪いみたい…。\nエラーが発生しちゃった。少し時間をおいてから、もう一度試してみてくれるかな？", sender: 'bot' };
            setMessages([errorMessage]);
        })
        .finally(() => {
            setIsBotTyping(false);
        });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleSendMessage = async (text: string) => {
    if (isBotTyping || !currentQuestion) return;

    const userMessage: ChatMessage = { id: Date.now(), text, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setQuestionsForCurrentTrait(prev => prev + 1);

    const timeToAnswer = Date.now() - questionTimestampRef.current;
    if (timeToAnswer < 2000) { // 2秒未満
        const newStreak = shortAnswerStreak + 1;
        setShortAnswerStreak(newStreak);
        if (newStreak >= 3) { // 3回連続
            const warningMsg: ChatMessage = { 
                id: Date.now() + 1, 
                text: "すごい速さだね！もう少しだけ、自分の心と向き合う時間を作ってみないかな？じっくり考えて答えてくれると、もっと君のことがわかる気がするんだ。", 
                sender: 'bot'
            };
            setMessages(prev => [...prev, warningMsg]);
            setImproperAnswers(prev => [...prev, currentQuestion]);
            setShortAnswerStreak(0);
        }
    } else {
        setShortAnswerStreak(0);
    }
    setSkipStreak(0);

    const newAnswer: Answer = {
      question: currentQuestion,
      answerText: text,
    };
    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    fetchAndProcess(newAnswers, false);
  };
  
  const handleSkip = () => {
    if (isBotTyping || !currentQuestion) return;
    setQuestionsForCurrentTrait(prev => prev + 1);

    setSkippedQuestions(prev => [...prev, currentQuestion]);

    const newStreak = skipStreak + 1;
    setSkipStreak(newStreak);
    if (newStreak >= 4) {
        const warningMsg: ChatMessage = { 
            id: Date.now(), 
            text: "続けてスキップしてるみたいだけど、何か答えにくい質問だったかな？もし疲れたら、一度休憩するのもいいかも。君のペースで大丈夫だから、正直な気持ちを聞かせてくれると嬉しいな。", 
            sender: 'bot' 
        };
        setMessages(prev => [...prev, warningMsg]);
        setImproperAnswers(prev => [...prev, currentQuestion]);
        setSkipStreak(0);
    }
    
    setShortAnswerStreak(0);
    fetchAndProcess(answers, true);
  };

  const handleGoBack = () => {
      if (answers.length < 1) return;
      
      setIsBotTyping(true);
      
      const newAnswers = answers.slice(0, -1);
      const newHistory = questionHistory.slice(0, -1);
      const prevQuestion = newHistory[newHistory.length - 1];

      let lastUserMessageIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].sender === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }
      
      if (lastUserMessageIndex === -1) {
          setIsBotTyping(false);
          return;
      }
      const newMessages = messages.slice(0, lastUserMessageIndex);

      setAnswers(newAnswers);
      setQuestionHistory(newHistory);
      setMessages(newMessages);
      setCurrentQuestion(prevQuestion);
      questionTimestampRef.current = Date.now();
      
      if (scoreHistory.length > 1) {
          const newScoreHistory = scoreHistory.slice(0, -1);
          setScoreHistory(newScoreHistory);
          setLastScores(newScoreHistory.length > 1 ? newScoreHistory[newScoreHistory.length - 2] : null);
      }
      
      if (questionsForCurrentTrait > 1) {
          setQuestionsForCurrentTrait(prev => prev - 1);
      }

      setIsBotTyping(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto h-[90vh] md:h-[85vh] flex flex-col p-4 md:p-6 bg-white rounded-xl shadow-2xl border border-gray-200">
      <div className="flex-grow overflow-y-auto pr-2 space-y-4 mb-4 hide-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-indigo-500 rounded-br-lg text-white' : 'bg-gray-200 rounded-bl-lg text-gray-800'}`}>
              <p className="text-sm md:text-base">{msg.text}</p>
            </div>
          </div>
        ))}
        {isBotTyping && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-gray-200 rounded-bl-lg">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 pt-4">
        {currentQuestion?.choices && !isBotTyping && (
            <div className="flex flex-wrap justify-center gap-3 mb-4">
                {currentQuestion.choices.map((choice, index) => (
                    <button
                        key={index}
                        onClick={() => handleSendMessage(choice)}
                        className="px-5 py-2.5 bg-white border border-indigo-500 text-indigo-600 font-semibold rounded-full hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all transform hover:scale-105"
                    >
                        {choice}
                    </button>
                ))}
            </div>
        )}
        <div className="flex justify-between items-center mt-4 px-2 sm:px-4">
          <Button onClick={handleGoBack} disabled={isBotTyping || answers.length < 1}>
              <span className="sm:hidden">戻る</span>
              <span className="hidden sm:inline">一つ前に戻る</span>
          </Button>
          <Button onClick={handleSkip} disabled={isBotTyping || !currentQuestion}>
              スキップ
          </Button>
        </div>
      </div>
    </div>
  );
};


const ResultsScreen: React.FC<ResultsScreenProps> = ({ results, onRestart, studentName, skippedQuestions, improperAnswers }) => {
  const allSkippedRaw = [...skippedQuestions, ...improperAnswers];
  const uniqueSkipped = Array.from(new Map(allSkippedRaw.map(q => [q.id, q])).values());
  const improperIds = new Set(improperAnswers.map(q => q.id));

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 bg-white rounded-xl shadow-2xl border border-gray-200 animate-fade-in relative">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">
          {studentName ? `${studentName}さんの診断結果` : '診断結果'}
        </h2>
        
        <div className="text-center mb-8 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-lg text-gray-600">あなたのタイプは...</p>
            <h3 className="text-3xl font-bold text-indigo-700 mt-2">{results.personalityType}</h3>
            <p className="text-gray-700 mt-4 max-w-2xl mx-auto whitespace-pre-wrap">{results.typeDescription}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
                <RadarChartComponent data={results.analysis} />
            </div>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {results.analysis.map(result => (
                    <div key={result.trait} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-indigo-600">{result.trait} : <span className="text-gray-900">{result.score}</span> / 100</h3>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                             <h4 className="font-semibold text-gray-700">💬 診断理由</h4>
                            <p className="text-gray-600 mt-1 text-sm italic">「{result.reason}」</p>
                        </div>
                        <p className="text-gray-700 mt-3 text-sm">{result.explanation}</p>
                        <div className="mt-4 pt-3 border-t border-gray-200">
                            <h4 className="font-semibold text-indigo-500">💡 アドバイス</h4>
                            <p className="text-gray-600 mt-1 text-sm">{result.advice}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200">
            <h3 className="text-2xl font-semibold text-center mb-6 text-gray-800">あなたの内面分析</h3>
            <div className="grid md:grid-cols-1 gap-6">
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h4 className="font-bold text-lg text-indigo-600 mb-2">🏡 家庭内でのあなた</h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{results.yourRoleInFamily}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h4 className="font-bold text-lg text-indigo-600 mb-2">📚 学習スタイル</h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{results.learningStyle}</p>
                </div>
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                    <h4 className="font-bold text-lg text-indigo-600 mb-2">🔥 動機づけ</h4>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">{results.motivationSource}</p>
                </div>
            </div>
        </div>

        {onRestart && (
            <div className="text-center mt-10">
                <Button onClick={onRestart}>もう一度診断する</Button>
            </div>
        )}
    </div>
  );
};


const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onLogout, realStudents }) => {
  const [studentResults, setStudentResults] = useState<StudentResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const generateRandomResult = useCallback((): StudentResult => {
    const names = ['デス 健', 'デス 杏', '高橋 大輔', '田中 美咲', '渡辺 翔太', '伊藤 さくら', 'デス 雄大', '中村 優衣'];
    const traits: TraitScore['trait'][] = ['自己肯定感', '協調性', '倫理観', '承認欲求', '忍耐力', '感情調整力', 'ストレス耐性', '柔軟性'];
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    
    // 1. 性格アーキタイプをランダムに選択
    const randomArchetype = PERSONALITY_ARCHETYPES[Math.floor(Math.random() * PERSONALITY_ARCHETYPES.length)];

    // 2. 選択したアーキタイプのスコアをベースに、ランダムな揺らぎを加えた分析データを生成
    const analysis: TraitScore[] = traits.map(trait => {
        const baseScore = randomArchetype.scores[trait] || 50; // アーキタイプの基本スコア
        // ±10点の範囲でランダムな揺らぎを追加
        const score = Math.max(1, Math.min(100, Math.round(baseScore + (Math.random() * 21) - 10)));
        
        return {
            trait,
            score,
            reason: `複数のサンプル回答から、${trait}においてこのスコア帯の傾向が示唆されました。`,
            explanation: `このスコアは、この生徒が${trait}に関して、${randomArchetype.name}タイプに典型的な特性を持っていることを示しています。`,
            advice: `${trait}のバランスをさらに良くするためには、個別の対話を通じて具体的な状況を把握し、適切なフィードバックを与えることが有効です。`
        };
    });

    const result: AnalysisResult = {
        personalityType: randomArchetype.name,
        typeDescription: randomArchetype.description,
        analysis,
        yourRoleInFamily: "家庭では、聞き役であり、家族の意見をまとめる調整役のような存在だったようです。あなたの存在が、家庭内の平和を保っていたのかもしれません。\n\nこれにより、あなたは人の意見を尊重し、対立を避ける傾向を身につけた可能性があります。しかし、時には自分の意見を抑え込んでしまうこともあったかもしれません。",
        learningStyle: "一人で黙々と集中するよりも、仲間と議論しながら学ぶことで、より深く理解できるタイプです。多様な意見に触れることが、知的好奇心を刺激します。\n\nグループワークやディスカッション形式の授業で能力を発揮しやすいでしょう。信頼できる仲間と共に学ぶことで、モチベーションも維持しやすくなります。",
        motivationSource: "誰かに褒められたり、認められたりすることよりも、「自分の成長を実感できた時」に最もモチベーションが高まるようです。内的な満足感が、原動力となっています。\n\n昨日よりもできることが増えたり、難しい課題を乗り越えたりした時に、大きな喜びを感じるでしょう。日々の小さな成功体験を記録することが、さらなる成長に繋がります。"
    };

    return {
        name: randomName,
        timestamp: Date.now() - Math.floor(Math.random() * 1000 * 3600 * 24 * 7), // 過去7日間のどこか
        result,
        skippedQuestions: [],
        improperAnswers: [],
    };
  }, []);
  
  useEffect(() => {
    // Generate sample data only once or merge with real data
    const mockResults = Array.from({ length: 4 }, () => generateRandomResult());
    // Merge real students with mock students
    setStudentResults([...realStudents, ...mockResults]);
    setIsLoading(false);
  }, [generateRandomResult, realStudents]); // realStudents in dependency to update if it changes

  const handleAddSampleStudent = () => {
    setStudentResults(prev => [generateRandomResult(), ...prev]);
  };
  
  const handleSelectStudent = (student: StudentResult) => {
    setSelectedStudent(student);
  }

  const handleBackToList = () => {
    setSelectedStudent(null);
  }

  if (isLoading) {
    return <Loader text="生徒データを読み込み中..." />;
  }
  
  if (selectedStudent) {
    return (
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center p-4">
        <ResultsScreen 
            results={selectedStudent.result}
            studentName={selectedStudent.name}
            skippedQuestions={selectedStudent.skippedQuestions || []}
            improperAnswers={selectedStudent.improperAnswers || []}
        />
        <div className="mt-8">
            <Button onClick={handleBackToList}>
                生徒一覧に戻る
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 bg-white rounded-xl shadow-2xl border border-gray-200">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800">教師用ダッシュボード</h1>
        <p className="mt-2 text-gray-600">生徒の診断結果一覧</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 font-semibold text-gray-700">生徒名</th>
              <th className="px-4 py-3 font-semibold text-gray-700">診断日時</th>
              <th className="px-4 py-3 font-semibold text-gray-700">診断タイプ</th>
              <th className="px-4 py-3 font-semibold text-gray-700 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {studentResults.sort((a, b) => b.timestamp - a.timestamp).map((student) => (
              <tr key={student.timestamp} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">
                    <div className="flex items-center">
                        {student.name}
                    </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{new Date(student.timestamp).toLocaleString('ja-JP')}</td>
                <td className="px-4 py-3 text-indigo-600 font-medium">
                    {student.result.personalityType}
                </td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => handleSelectStudent(student)}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    詳細を見る
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
        <Button onClick={handleAddSampleStudent}>
            サンプル生徒を追加
        </Button>
        <Button onClick={onLogout}>
            ログアウト
        </Button>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.Login);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [allStudentResults, setAllStudentResults] = useState<StudentResult[]>([]);
  
  const [finalSkippedQuestions, setFinalSkippedQuestions] = useState<Question[]>([]);
  const [finalImproperAnswers, setFinalImproperAnswers] = useState<Question[]>([]);
  

  const handleLogin = (passcode: string, role: 'student' | 'teacher'): boolean => {
    // NOTE: Passcode validation is currently disabled for ease of testing.
    // Any input will be accepted.
    if (role === 'student' && passcode) {
      setUserRole('student');
      setGameState(GameState.StudentNameInput);
      return true;
    }
    if (role === 'teacher' && passcode) {
      setUserRole('teacher');
      setGameState(GameState.TeacherDashboard);
      return true;
    }
    return false;
  };

  const handleNameSubmit = (name: string) => {
    setStudentName(name);
    setGameState(GameState.Start);
  };
  
  const handleStartQuiz = () => {
    setGameState(GameState.Quiz);
  };

  const handleSubmitQuiz = useCallback(async (answers: Answer[], skipped: Question[], improper: Question[]) => {
    setGameState(GameState.Analyzing);
    setFinalSkippedQuestions(skipped);
    setFinalImproperAnswers(improper);
    try {
      const results = await analyzeAnswers(answers, skipped);
      setAnalysisResult(results);
      
      const timestamp = Date.now();

      if (userRole === 'student' && studentName) {
          const newStudentResult: StudentResult = {
              name: studentName,
              timestamp: timestamp,
              result: results,
              skippedQuestions: skipped,
              improperAnswers: improper,
          };
          setAllStudentResults(prev => [...prev, newStudentResult]);
      }
      setGameState(GameState.Results);
    } catch (error) {
      console.error("Analysis failed:", error);
      setGameState(GameState.Error);
    }
  }, [studentName, userRole]);


  const handleRestart = () => {
    setAnalysisResult(null);
    setFinalSkippedQuestions([]);
    setFinalImproperAnswers([]);

    if (userRole === 'student') {
        setGameState(GameState.Start);
    } else {
        setGameState(GameState.Login);
    }
  };

  const handleLogout = () => {
      setUserRole(null);
      setStudentName('');
      setAnalysisResult(null);
      setFinalSkippedQuestions([]);
      setFinalImproperAnswers([]);
      setGameState(GameState.Login);
  };
  
  const renderContent = () => {
      switch (gameState) {
          case GameState.Login:
              return <LoginScreen onLogin={handleLogin} />;
          case GameState.StudentNameInput:
              return <StudentNameInputScreen onSubmit={handleNameSubmit} />;
          case GameState.Start:
              return <StartScreen onStart={handleStartQuiz} />;
          case GameState.Quiz:
              return <ChatScreen onSubmit={handleSubmitQuiz} />;
          case GameState.Analyzing:
              return <Loader text="あなたの心を分析中..." />;
          case GameState.Results:
              if (analysisResult) {
                  return <ResultsScreen 
                      results={analysisResult} 
                      onRestart={handleRestart} 
                      studentName={studentName}
                      skippedQuestions={finalSkippedQuestions}
                      improperAnswers={finalImproperAnswers}
                  />;
              }
               // Fallback to error if results are missing for some reason
              setGameState(GameState.Error);
              return null;
          case GameState.TeacherDashboard:
               return <TeacherDashboard onLogout={handleLogout} realStudents={allStudentResults} />;
          case GameState.Error:
              return (
                  <div className="text-center p-8 bg-white rounded-xl shadow-2xl">
                      <h1 className="text-3xl font-bold text-red-500">エラーが発生しました</h1>
                      <p className="mt-4">分析に失敗しました。もう一度お試しください。</p>
                      <div className="mt-8">
                          <Button onClick={handleRestart}>やり直す</Button>
                      </div>
                  </div>
              );
          default:
             // Fallback to login screen if state is invalid
              return <LoginScreen onLogin={handleLogin} />;
      }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gray-100">
      {renderContent()}
    </main>
  );
};

export default App;