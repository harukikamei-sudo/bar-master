import { useState, useRef, useCallback } from 'react';
import drinks from '../data/drinks.json';
import {
  chatPatterns,
  fallbackResponses,
  humanTouchLines,
  getGreeting,
  getReturnGreeting,
  getVisitMessage,
  upsellResponses,
  followUpResponses,
  initialChoices,
} from '../data/chatPatterns';

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findDrinks(tags) {
  const scored = drinks.filter(d => !d.secret).map(d => {
    let score = 0;
    if (tags.type && tags.type !== 'any' && d.type === tags.type) score += 10;
    if (tags.mood && tags.mood !== 'any' && d.tags.mood.includes(tags.mood)) score += 5;
    if (tags.taste && tags.taste !== 'any' && d.tags.taste.includes(tags.taste)) score += 3;
    return { drink: d, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.drink);
}

function getSecretDrink() {
  return drinks.find(d => d.secret);
}

// localStorage ヘルパー
function getStorage(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function setStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function useConversation() {
  const [messages, setMessages] = useState([]);
  const [choices, setChoices] = useState([]);
  const [selectedDrinks, setSelectedDrinks] = useState([]);
  const [currentDrink, setCurrentDrink] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [masterAnimation, setMasterAnimation] = useState('idle');

  const tags = useRef({ mood: null, taste: null, type: null });
  const matched = useRef([]);
  const matchIdx = useRef(0);
  const started = useRef(false);
  const rotationCounters = useRef({});
  const purchaseCount = useRef(0);
  const discountRate = useRef(0);
  const pendingAction = useRef(null);

  // タイピング完了通知 — 保留中のアクションがあれば実行
  const notifyTypingDone = useCallback(() => {
    if (pendingAction.current) {
      const action = pendingAction.current;
      pendingAction.current = null;
      action();
    }
  }, []);

  // マスターの発言を追加
  const addMasterMsg = useCallback((text, animation = 'talk') => {
    setMessages(prev => [...prev, { role: 'master', text }]);
    setMasterAnimation('idle');
    setTimeout(() => setMasterAnimation(animation), 50);
  }, []);

  // お酒提案フローを開始
  const showRecommendation = useCallback(() => {
    const found = findDrinks(tags.current);
    if (matched.current.length === 0 || matched.current[0]?.id !== found[0]?.id) {
      matched.current = found;
      matchIdx.current = 0;
    } else {
      matchIdx.current = (matchIdx.current + 1) % matched.current.length;
    }
    setCurrentDrink(matched.current[matchIdx.current]);
    pendingAction.current = () => {
      setShowPanel(true);
      setChoices([
        { label: 'これにする', action: 'addToList' },
        { label: '他のも見たい', action: 'nextDrink' },
        { label: '違うジャンルで', action: 'restart' },
      ]);
    };
  }, []);

  // キーワードマッチ
  const matchKeywords = useCallback((input) => {
    const lower = input.toLowerCase();
    for (const pattern of chatPatterns) {
      for (const kw of pattern.keywords) {
        if (lower.includes(kw.toLowerCase())) {
          return pattern;
        }
      }
    }
    return null;
  }, []);

  // パターンから返答取得
  const getResponse = useCallback((pattern) => {
    if (pattern.rotation) {
      const key = pattern.keywords[0];
      const idx = rotationCounters.current[key] || 0;
      rotationCounters.current[key] = (idx + 1) % pattern.responses.length;
      return pattern.responses[idx];
    }
    return pickRandom(pattern.responses);
  }, []);

  // 人間味雑談を一定確率で追加
  const maybeAddHumanTouch = useCallback(() => {
    if (Math.random() < 0.1) {
      const line = pickRandom(humanTouchLines);
      setTimeout(() => {
        addMasterMsg(line, 'talk');
      }, 3000);
    }
  }, [addMasterMsg]);

  // === 開始 ===
  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    tags.current = { mood: null, taste: null, type: null };
    matched.current = [];
    matchIdx.current = 0;

    // 訪問回数
    const visitCount = getStorage('barmaster_visits', 0) + 1;
    setStorage('barmaster_visits', visitCount);
    const lastDrink = getStorage('barmaster_lastDrink', null);
    const isReturn = visitCount > 1;

    // メッセージを順番に出すキュー
    const queue = [];
    let delay = 0;

    // 1. 挨拶
    const greeting = isReturn ? getReturnGreeting(lastDrink) : getGreeting();
    addMasterMsg(greeting, 'greet');

    // 2. 訪問回数メッセージ
    const visitMsg = getVisitMessage(visitCount);
    if (visitMsg) {
      delay += 3500;
      queue.push({ delay, fn: () => addMasterMsg(visitMsg, 'talk') });
    }

    // 3. 5回以上の常連には割引
    if (visitCount >= 5) {
      discountRate.current = 0.1;
      const discountLines = [
        'あと、いつも来てくださるので…今日はちょっとだけサービスしておきますね。全品10%OFFにしておきます。',
        '常連さんには内緒のサービスなんですが…今日は10%引きにしておきますよ。',
        'いつもありがとうございます。今日はささやかですが、10%割引しておきますね。',
      ];
      delay += 4000;
      queue.push({ delay, fn: () => addMasterMsg(pickRandom(discountLines), 'bow') });
    }

    // 4. 10回以上の常連にだけ裏メニューを提案
    if (visitCount >= 10) {
      delay += 4500;
      queue.push({ delay, fn: () => {
        addMasterMsg('…実は今日、お客さまにだけ特別にお見せしたいものがあるんです。\nここだけの話なんですが…興味ありますか？', 'talk');
        setChoices([
          { label: '気になる…', action: 'secretMenu' },
          { label: '普通のメニューで', action: 'initialChoice', tag: 'any' },
        ]);
      }});
    } else if (!isReturn) {
      setChoices(initialChoices.map(c => ({ ...c, action: 'initialChoice' })));
    }

    // キュー実行
    queue.forEach(item => setTimeout(item.fn, item.delay));
  }, [addMasterMsg]);

  // === テキスト入力処理 ===
  const handleTextInput = useCallback((text) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setChoices([]);

    const pattern = matchKeywords(text);

    if (pattern) {
      // タグ設定
      if (pattern.setTag) {
        Object.assign(tags.current, pattern.setTag);
      }

      const response = getResponse(pattern);
      const anim = pattern.animation || 'talk';

      setTimeout(() => {
        addMasterMsg(response, anim);

        // アクション処理
        if (pattern.action === 'secretMenu') {
          const visitCount = getStorage('barmaster_visits', 0);
          if (visitCount >= 10) {
            pendingAction.current = () => {
              const secret = getSecretDrink();
              if (secret) {
                matched.current = [secret];
                matchIdx.current = 0;
                setCurrentDrink(secret);
                setShowPanel(true);
                setChoices([
                  { label: 'これにする', action: 'addToList' },
                  { label: '今日はやめておく', action: 'restart' },
                ]);
              }
            };
          } else {
            setTimeout(() => {
              addMasterMsg('裏メニュー…ですか？ふふ、そういうのはもう少し通っていただいてからですね。楽しみにしていてください。', 'talk');
              setChoices(initialChoices.map(c => ({ ...c, action: 'initialChoice' })));
            }, 1500);
          }
        } else if (pattern.action === 'recommend') {
          showRecommendation();
        } else if (pattern.action === 'askTaste') {
          setChoices([
            { label: '甘めが好き', action: 'tasteChoice', tag: 'sweet' },
            { label: '辛口・ドライ', action: 'tasteChoice', tag: 'dry' },
            { label: 'フルーティ', action: 'tasteChoice', tag: 'fruity' },
            { label: '苦味があるもの', action: 'tasteChoice', tag: 'bitter' },
            { label: 'おまかせ', action: 'tasteChoice', tag: 'any' },
          ]);
        } else {
          // 会話系（アクションなし）→ 選択肢を再表示
          setTimeout(() => {
            setChoices(initialChoices.map(c => ({ ...c, action: 'initialChoice' })));
          }, 1500);
        }

        maybeAddHumanTouch();
      }, 800);
    } else {
      // フォールバック
      setTimeout(() => {
        addMasterMsg(pickRandom(fallbackResponses), 'talk');
        setChoices(initialChoices.map(c => ({ ...c, action: 'initialChoice' })));
      }, 800);
    }
  }, [addMasterMsg, matchKeywords, getResponse, showRecommendation, maybeAddHumanTouch]);

  // === 選択肢クリック処理 ===
  const selectChoice = useCallback((choice) => {
    setMessages(prev => [...prev, { role: 'user', text: choice.label }]);
    setChoices([]);

    // 裏メニュー（選択肢ボタンから）
    if (choice.action === 'secretMenu') {
      setTimeout(() => {
        addMasterMsg('…ふふ、気になりますか。\nこちら、普段はお出ししていない特別な一本です。しかも今日は…少しだけお安くしておきますよ。', 'talk');
        const secret = getSecretDrink();
        if (secret) {
          matched.current = [secret];
          matchIdx.current = 0;
          setCurrentDrink(secret);
          pendingAction.current = () => {
            setShowPanel(true);
            setChoices([
              { label: 'これにする', action: 'addToList' },
              { label: '今日はやめておく', action: 'restart' },
            ]);
          };
        }
      }, 800);
      return;
    }

    // 初回選択肢ボタン
    if (choice.action === 'initialChoice') {
      if (choice.tag) tags.current.taste = choice.tag;
      handleTextInput(choice.label);
      // handleTextInput が既にメッセージ追加するので、上のsetMessagesを取消
      setMessages(prev => prev.slice(0, -1));
      return;
    }

    // 味選択
    if (choice.action === 'tasteChoice') {
      if (choice.tag) tags.current.taste = choice.tag;
      setTimeout(() => {
        addMasterMsg('ちょっと見繕いますね。少々お待ちください。', 'talk');
        showRecommendation();
      }, 800);
      return;
    }

    // お酒をカートに追加
    if (choice.action === 'addToList') {
      const drink = matched.current[matchIdx.current];
      if (drink) {
        const rate = discountRate.current;
        const discounted = rate > 0 && !drink.secret ? {
          ...drink,
          priceNum: Math.round(drink.priceNum * (1 - rate)),
          price: `¥${Math.round(drink.priceNum * (1 - rate)).toLocaleString()}`,
          originalPrice: drink.price,
        } : drink;
        setSelectedDrinks(prev => [...prev, discounted]);
        setStorage('barmaster_lastDrink', drink.nameJa);
        purchaseCount.current++;
        const se = new Audio('/audio/glass_clink.mp3');
        se.volume = 0.5;
        se.play().catch(() => {});
      }
      setShowPanel(false);

      setTimeout(() => {
        const responses = [
          '素晴らしいお選びです。もう一杯いかがですか？',
          'いいチョイスですね。他にも気になるものがあれば、お気軽にどうぞ。',
        ];
        addMasterMsg(pickRandom(responses), 'bow');

        // 2杯目以降：アップセル提案を一定確率で
        if (purchaseCount.current >= 2 && Math.random() < 0.3) {
          setTimeout(() => {
            addMasterMsg(pickRandom(upsellResponses), 'talk');
          }, 3000);
        }

        setChoices([
          { label: 'もう一杯お願い', action: 'another' },
          { label: 'ありがとう', action: 'thank' },
          { label: 'お会計で', action: 'checkout' },
        ]);
      }, 800);
      return;
    }

    // 他のも見たい → 深掘り質問
    if (choice.action === 'nextDrink') {
      setShowPanel(false);
      setTimeout(() => {
        const questions = [
          '迷われますよね。もう少し絞りましょうか。\nどんな方向がいいですか？',
          'なるほど。もう少しお好みを聞かせてもらえますか？',
          'では、別の角度からご提案しますね。\nどんな気分ですか？',
        ];
        addMasterMsg(pickRandom(questions), 'talk');
        setChoices([
          { label: '甘めで', action: 'narrowDown', tag: 'sweet' },
          { label: 'すっきり系', action: 'narrowDown', tag: 'dry' },
          { label: 'もっと重め', action: 'narrowDown', tag: 'bitter' },
          { label: 'やっぱりおまかせ', action: 'narrowDown', tag: 'any' },
        ]);
      }, 800);
      return;
    }

    // 深掘り後の提案
    if (choice.action === 'narrowDown') {
      if (choice.tag && choice.tag !== 'any') tags.current.taste = choice.tag;
      matchIdx.current = (matchIdx.current + 1) % matched.current.length;
      // タグが変わったら再検索
      const found = findDrinks(tags.current);
      matched.current = found;
      if (matchIdx.current >= found.length) matchIdx.current = 0;
      setCurrentDrink(matched.current[matchIdx.current]);
      setTimeout(() => {
        const responses = [
          'それでしたら、こちらはいかがでしょう。',
          'なるほど。でしたらこちらをお出ししますね。',
        ];
        addMasterMsg(pickRandom(responses), 'talk');
        pendingAction.current = () => {
          setShowPanel(true);
          setChoices([
            { label: 'これにする', action: 'addToList' },
            { label: '他のも見たい', action: 'nextDrink' },
            { label: '違うジャンルで', action: 'restart' },
          ]);
        };
      }, 800);
      return;
    }

    // 違うジャンルで
    if (choice.action === 'restart') {
      setShowPanel(false);
      tags.current = { mood: null, taste: null, type: null };
      matched.current = [];
      matchIdx.current = 0;
      setTimeout(() => {
        addMasterMsg('かしこまりました。どのあたりがお好みですか？', 'talk');
        setChoices(initialChoices.map(c => ({ ...c, action: 'initialChoice' })));
      }, 800);
      return;
    }

    // もう一杯
    if (choice.action === 'another') {
      tags.current = { mood: null, taste: null, type: null };
      matched.current = [];
      matchIdx.current = 0;
      setTimeout(() => {
        addMasterMsg('まだまだお付き合いしますよ。今度はどんな気分ですか？', 'talk');
        setChoices(initialChoices.map(c => ({ ...c, action: 'initialChoice' })));
      }, 800);
      return;
    }

    // ありがとう
    if (choice.action === 'thank') {
      setTimeout(() => {
        const responses = [
          'とんでもないです。いい一杯に出会えたなら、こちらも嬉しいです。',
          'こちらこそ、ありがとうございます。まだまだお付き合いしますよ。',
        ];
        addMasterMsg(pickRandom(responses), 'thank');
        setChoices([
          { label: 'もう一杯お願い', action: 'another' },
          { label: 'お会計で', action: 'checkout' },
        ]);
      }, 800);
      return;
    }

    // お会計
    if (choice.action === 'checkout') {
      setShowPanel(false);
      setTimeout(() => {
        const responses = [
          'ありがとうございました。今宵もいい夜を。またのお越しをお待ちしております。',
          'ありがとうございました。お気をつけてお帰りくださいね。またいらしてください。',
        ];
        addMasterMsg(pickRandom(responses), 'bow');
        setTimeout(() => {
          const se = new Audio('/audio/bell_checkout.mp3');
          se.volume = 0.5;
          se.play().catch(() => {});
          setShowResult(true);
        }, 1500);
      }, 800);
      return;
    }
  }, [addMasterMsg, handleTextInput, showRecommendation]);

  const removeDrink = useCallback((id) => {
    setSelectedDrinks(prev => prev.filter(d => d.id !== id));
  }, []);

  const restart = useCallback(() => {
    setMessages([]);
    setChoices([]);
    setSelectedDrinks([]);
    setCurrentDrink(null);
    setShowPanel(false);
    setShowResult(false);
    tags.current = { mood: null, taste: null, type: null };
    matched.current = [];
    matchIdx.current = 0;
    purchaseCount.current = 0;
    started.current = false;
    setTimeout(() => start(), 300);
  }, [start]);

  return {
    messages, choices, selectedDrinks, currentDrink,
    showPanel, showResult, masterAnimation,
    start, selectChoice, handleTextInput, removeDrink, setShowPanel, restart,
    notifyTypingDone,
  };
}
