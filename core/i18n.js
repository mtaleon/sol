const translations = {
  en: {
    'header.pause': 'Pause',
    'header.mistakes': 'Mistakes: {current}{limit}',

    'tool.undo': 'Undo',
    'tool.undo.title': 'Undo (long-press: Redo)',
    'tool.notes': 'Notes',
    'tool.hint': 'Hint',
    'tool.clear': 'Clear',
    'tool.clear.title': 'Clear (long-press: Clear notes)',

    'pause.title': 'Paused',
    'pause.resume': 'Resume',
    'pause.restart': 'Restart',
    'pause.newGame': 'New Game',
    'pause.settings': 'Settings',

    'difficulty.title': 'Select Difficulty',
    'difficulty.easy': 'Easy',
    'difficulty.medium': 'Medium',
    'difficulty.hard': 'Hard',
    'difficulty.custom': 'Custom',
    'difficulty.clues': '{n} clues',
    'difficulty.cancel': 'Cancel',

    'settings.title': 'Settings',
    'settings.done': 'Done',
    'settings.mistakeLimit': 'Mistakes limit',
    'settings.off': 'Off',
    'settings.unlimited': 'No limit',
    'settings.showTimer': 'Show timer',
    'settings.autoRemoveNotes': 'Auto-remove notes',
    'settings.highlightRegion': 'Highlight row/col/box',
    'settings.highlightSameNumber': 'Highlight same number',
    'settings.showConflicts': 'Show conflicts',
    'settings.language': 'Language',

    'win.title': 'Completed',
    'win.time': 'Time: {time}',
    'win.moves': 'Moves: {moves}',
    'win.mistakes': 'Mistakes: {n}',
    'win.hints': 'Hints used: {n}',
    'win.playAgain': 'Play again',
    'win.promo': 'Explore further: ',

    'gameover.title': 'Game over',
    'gameover.tryAgain': 'Try again',
    'gameover.newGame': 'New game',

    'toast.gameRestarted': 'Game restarted',
    'toast.nothingToUndo': 'Nothing to undo',
    'toast.nothingToRedo': 'Nothing to redo',
    'toast.undoRedoTip': 'Long-press Undo to redo',
    'toast.gameSaved': 'Game saved',
    'toast.puzzleSolved': 'Puzzle solved',
    'toast.solveFailed': 'Could not solve puzzle',
  },

  'zh-TW': {
    'header.pause': '暫停',
    'header.mistakes': '錯誤：{current}{limit}',

    'tool.undo': '復原',
    'tool.undo.title': '復原（長按：重做）',
    'tool.notes': '筆記',
    'tool.hint': '提示',
    'tool.clear': '清除',
    'tool.clear.title': '清除（長按：清除筆記）',

    'pause.title': '已暫停',
    'pause.resume': '繼續',
    'pause.restart': '重新開始',
    'pause.newGame': '新遊戲',
    'pause.settings': '設定',

    'difficulty.title': '選擇難度',
    'difficulty.easy': '簡單',
    'difficulty.medium': '中等',
    'difficulty.hard': '困難',
    'difficulty.custom': '自訂',
    'difficulty.clues': '{n} 個提示數',
    'difficulty.cancel': '取消',

    'settings.title': '設定',
    'settings.done': '完成',
    'settings.mistakeLimit': '錯誤上限',
    'settings.off': '關',
    'settings.unlimited': '無限',
    'settings.showTimer': '顯示計時器',
    'settings.autoRemoveNotes': '自動移除筆記',
    'settings.highlightRegion': '高亮行／列／宮',
    'settings.highlightSameNumber': '高亮相同數字',
    'settings.showConflicts': '顯示衝突',
    'settings.language': '語言',

    'win.title': '完成',
    'win.time': '時間：{time}',
    'win.moves': '步數：{moves}',
    'win.mistakes': '錯誤：{n}',
    'win.hints': '使用提示：{n}',
    'win.playAgain': '再玩一局',
    'win.promo': '探索更多：',

    'gameover.title': '遊戲結束',
    'gameover.tryAgain': '再試一次',
    'gameover.newGame': '新遊戲',

    'toast.gameRestarted': '遊戲已重新開始',
    'toast.nothingToUndo': '沒有可復原的操作',
    'toast.nothingToRedo': '沒有可重做的操作',
    'toast.undoRedoTip': '長按「復原」可重做',
    'toast.gameSaved': '遊戲已儲存',
    'toast.puzzleSolved': '謎題已解開',
    'toast.solveFailed': '無法解開謎題',
  }
};

let currentLang = 'en';

export function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
  }
}

export function getLanguage() {
  return currentLang;
}

export function t(key, params) {
  let str = translations[currentLang]?.[key] || translations['en'][key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}
