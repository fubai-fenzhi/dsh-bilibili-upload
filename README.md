# dsh-bilibili-upload

鎶婅棰戜粠 DSH 涓婁紶/缂栬緫鍒?B 绔欙紝搴曞眰鐢?[biliup](https://github.com/biliup/biliup) CLI銆?
## 鍓嶆彁

1. 瀹夎 biliup锛圵indows 鐢?`biliupR-*-x86_64-windows.zip`锛岃В鍘嬪嵆鐢級
2. 鍦?biliup 鐩綍杩愯涓€娆?`biliup login`锛屾墜鏈烘壂鐮佺櫥褰曪紙鐢熸垚 `cookies.json`锛?3. 鎻掍欢榛樿鎸囧悜宸茶璺緞锛坄biliupPath` 鍙敼锛?
## 宸ュ叿

### `bili_upload`

| 鍙傛暟 | 璇存槑 |
|---|---|
| `video` | 瑙嗛缁濆璺緞锛堝繀濉級 |
| `title` | 鏍囬锛堝繀濉紝绾?80 瀛楀唴锛?|
| `desc` | 绠€浠?|
| `tags` | 鏍囩鏁扮粍锛岄粯璁ょ敤閰嶇疆 |
| `cover` | 灏侀潰鍥剧粷瀵硅矾寰勶紙4:3 鎴?16:9锛?|
| `tid` | 鍒嗗尯锛岄粯璁?188锛堢鎶€鈫掕绠楁満鎶€鏈級 |
| `submit` | 鎻愪氦鎺ュ彛锛岄粯璁?**web**锛堝垎鍖烘槧灏勬洿鍑嗭紱app 浼氭妸 188 鍙樻垚 21锛?|
| `onlySelf` | `true`锛堥粯璁わ級= 浠呰嚜宸卞彲瑙侊紱`false` = 鍏紑 |
| `dryRun` | 鍙洖鏄惧懡浠わ紝涓嶄笂浼?|

### `bili_edit`

鏀瑰凡涓婁紶绋夸欢鐨勬爣棰?鍒嗗尯/鏍囩/绠€浠?鍙鎬э紙璧?B 绔欏畼鏂圭紪杈戞帴鍙ｏ紝闇€瑕佹湰鏈?cookies锛夈€?
- 瀹℃牳涓紙state -50锛変細鎷掔粷骞舵彁绀虹◢鍚庨噸璇?- 鏀瑰畬鑷姩鍥炶鐘舵€?
### `bili_check`

妫€鏌?biliup 璺緞銆佺櫥褰?cookie锛涘彲閫変紶 BV 鍙风湅绋夸欢銆?
## 闈㈡澘

璁剧疆 鈫?鎻掍欢 鈫?**B 绔欎笂浼?*锛氬～瑙嗛/鏍囬/绠€浠?鏍囩/灏侀潰/鍒嗗尯锛屽嬀閫夊彲瑙佹€э紝涓€閿笂浼狅紱涓嬫柟鍙敼宸叉湁 BV 鐨勬爣棰?鍙鎬с€?
璺敱锛歚/bili-upload/state`銆乣/bili-upload/upload`銆乣/bili-upload/edit`銆?
## 閰嶇疆

```yaml
- id: bili-upload
  name: dsh-bilibili-upload
  config:
    biliupPath: 'E:\Tools\biliup\biliupR-v1.3.5-x86_64-windows\biliup.exe'
    defaultTid: 188
    defaultTags: [DeepSeek Harness, DSH, 鎻掍欢]
    defaultOnlySelf: true
    defaultSubmit: web
```

## 瀹夊叏

- cookie 鍙瓨鏈満锛坆iliup 鐩綍锛夛紝涓嶈繘浠撳簱
- 榛樿浠呰嚜宸卞彲瑙侊紝閬垮厤璇叕寮€
- 鍙敤浜庝綘鑷繁鐨勮处鍙凤紝閬靛畧 B 绔欐姇绋胯鑼?
