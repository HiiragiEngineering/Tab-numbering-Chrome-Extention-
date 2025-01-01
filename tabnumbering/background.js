// 実行中のタイマーを保持する変数
let updateTimer = null;

// 連続した更新を防ぐための最小間隔（ミリ秒）
const UPDATE_DELAY = 50;

async function updateTabNumbers() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    
    // 並列で全タブを処理
    await Promise.all(tabs.map(async (tab, index) => {
      if (!tab.url.startsWith('chrome://')) {   //Chrome内部ページはスキップ＿本当はしたくない
        try {
          if (index < 9) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (number) => {
                if (!document.title.startsWith(`[${number}]`)) {
                  document.title = document.title.replace(/^\[\d+\] /, '');
                  document.title = `[${number}] ${document.title}`;
                }
              },
              args: [index + 1]
            });
          } else {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                document.title = document.title.replace(/^\[\d+\] /, '');
              }
            });
          }
        } catch (err) {
          // 特定のタブでのエラーを無視（アクセス不可能なタブなど）
        }
      }
    }));
  } catch (err) {
    console.error('Error updating tabs:', err);
  }
}

// 更新をスケジュールする関数
function scheduleUpdate() {
  if (updateTimer) {
    clearTimeout(updateTimer);
  }
  updateTimer = setTimeout(updateTabNumbers, UPDATE_DELAY);
}


// open as a new window(now suspended)
/*
chrome.tabs.onCreated.addListener(async (tab) => {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs.length >= 10) {  // 10個目のタブが開かれた場合、新しいウィンドウで開く
    chrome.windows.create({ tabId: tab.id });
  }
  scheduleUpdate();
});
*/


// 拡張機能のアイコンがクリックされたときに即時実行
chrome.action.onClicked.addListener(() => {
  updateTabNumbers();
});

// タブの変更イベントをまとめて処理
chrome.tabs.onMoved.addListener(scheduleUpdate);
chrome.tabs.onCreated.addListener(scheduleUpdate);
chrome.tabs.onActivated.addListener(scheduleUpdate);
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.title) {
    scheduleUpdate();
  }
});

// 初回起動時に実行
updateTabNumbers();
