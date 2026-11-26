window.__ModuleLoader__.load({
  id: 'dsh-bilibili-upload',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const fieldStyle = { display: 'grid', gap: '2px', fontSize: '12px' };
    const inputStyle = { padding: '4px 6px', fontSize: '12px', width: '100%', boxSizing: 'border-box' };
    const mono = { fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap' };

    function Panel() {
      const [state, setState] = React.useState(null);
      const [video, setVideo] = React.useState('');
      const [title, setTitle] = React.useState('');
      const [desc, setDesc] = React.useState('');
      const [tags, setTags] = React.useState('');
      const [cover, setCover] = React.useState('');
      const [tid, setTid] = React.useState('188');
      const [submit, setSubmit] = React.useState('web');
      const [onlySelf, setOnlySelf] = React.useState(true);
      const [busy, setBusy] = React.useState(false);
      const [result, setResult] = React.useState('');

      const [bvid, setBvid] = React.useState('');
      const [editTitle, setEditTitle] = React.useState('');
      const [editOnlySelf, setEditOnlySelf] = React.useState(false);

      React.useEffect(() => {
        fetch('/bili-upload/state')
          .then((response) => response.json())
          .then(setState)
          .catch(() => setState({ biliup: false, cookies: false }));
      }, []);

      async function post(url, body) {
        setBusy(true);
        setResult('');
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          setResult(JSON.stringify(data, null, 2));
        } catch (error) {
          setResult(String(error));
        } finally {
          setBusy(false);
        }
      }

      const upload = () => post('/bili-upload/upload', {
        video,
        title,
        desc,
        tags: tags.split(',').map((item) => item.trim()).filter(Boolean),
        cover,
        tid: Number.parseInt(tid, 10) || 188,
        submit,
        onlySelf,
      });

      const edit = () => post('/bili-upload/edit', {
        bvid,
        title: editTitle || undefined,
        onlySelf: editOnlySelf,
      });

      return h('div', { style: { padding: '16px', display: 'grid', gap: '10px', fontSize: '13px' } },
        h('h3', { style: { margin: 0 } }, 'B 站上传 · dsh-bilibili-upload'),
        h('div', { style: { fontSize: '12px', opacity: 0.75 } },
          state
            ? `biliup ${state.biliup ? '✅' : '❌ 未找到'}　cookies ${state.cookies ? '✅ 已登录' : '❌ 未登录'}`
            : '检查状态中…'),
        h('div', { style: fieldStyle }, h('span', null, '视频路径'), h('input', { style: inputStyle, value: video, onChange: (e) => setVideo(e.target.value), placeholder: 'E:\\...\\video.mp4' })),
        h('div', { style: fieldStyle }, h('span', null, '标题'), h('input', { style: inputStyle, value: title, onChange: (e) => setTitle(e.target.value) })),
        h('div', { style: fieldStyle }, h('span', null, '简介'), h('textarea', { style: { ...inputStyle, minHeight: '60px' }, value: desc, onChange: (e) => setDesc(e.target.value) })),
        h('div', { style: fieldStyle }, h('span', null, '标签（逗号分隔）'), h('input', { style: inputStyle, value: tags, onChange: (e) => setTags(e.target.value), placeholder: 'DeepSeek Harness,DSH,插件' })),
        h('div', { style: fieldStyle }, h('span', null, '封面路径（可选）'), h('input', { style: inputStyle, value: cover, onChange: (e) => setCover(e.target.value) })),
        h('div', { style: { display: 'flex', gap: '12px', alignItems: 'end' } },
          h('div', { style: { ...fieldStyle, flex: '1' } }, h('span', null, '分区 tid'), h('input', { style: inputStyle, value: tid, onChange: (e) => setTid(e.target.value) })),
          h('div', { style: { ...fieldStyle, flex: '1' } }, h('span', null, '提交接口'), h('select', { style: inputStyle, value: submit, onChange: (e) => setSubmit(e.target.value) },
            h('option', { value: 'app' }, 'app'),
            h('option', { value: 'web' }, 'web'))),
          h('label', { style: { display: 'flex', gap: '4px', alignItems: 'center', fontSize: '12px' } },
            h('input', { type: 'checkbox', checked: onlySelf, onChange: (e) => setOnlySelf(e.target.checked) }),
            '仅自己可见')),
        h('div', null, h('button', { onClick: upload, disabled: busy }, busy ? '处理中…' : '上传视频')),
        h('hr', { style: { borderColor: 'rgba(127,127,127,.3)' } }),
        h('div', { style: { display: 'flex', gap: '10px' } },
          h('div', { style: { ...fieldStyle, flex: '1' } }, h('span', null, 'BV 号（编辑）'), h('input', { style: inputStyle, value: bvid, onChange: (e) => setBvid(e.target.value), placeholder: 'BV...' })),
          h('div', { style: { ...fieldStyle, flex: '1' } }, h('span', null, '新标题（可选）'), h('input', { style: inputStyle, value: editTitle, onChange: (e) => setEditTitle(e.target.value) }))),
        h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
          h('label', { style: { display: 'flex', gap: '4px', alignItems: 'center', fontSize: '12px' } },
            h('input', { type: 'checkbox', checked: editOnlySelf, onChange: (e) => setEditOnlySelf(e.target.checked) }),
            '设为仅自己可见（不勾=公开）'),
          h('button', { onClick: edit, disabled: busy }, '编辑稿件')),
        result ? h('pre', { style: { ...mono, maxHeight: '220px', overflow: 'auto', background: 'rgba(127,127,127,.1)', padding: '8px', borderRadius: '6px' } }, result) : null,
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
          name: 'settings.plugins.tab',
          id: 'bili-upload',
          order: 52,
          label: 'B 站上传',
        }, Panel));
      },
    };
  },
});
