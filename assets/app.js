/* ==========================================================================
   AlexYang —— 站点逻辑
   零依赖。自己做 Markdown 解析,避免引入第三方库
   (国内 CDN 不可靠,也不值得为这点功能多一次网络请求)。
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     工具
     ------------------------------------------------------------------ */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* 只放行安全协议,挡掉 javascript: 这类注入 */
  function safeUrl(url) {
    var u = String(url).trim();
    if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(u)) return u;
    return '#';
  }

  function escapeAttr(s) { return escapeHtml(s); }

  /* ------------------------------------------------------------------
    行内 Markdown
     顺序要紧:先做行内代码,它的内容不该再被后续规则解释。
     ------------------------------------------------------------------ */
  function inline(text) {
    var s = escapeHtml(text);
    var stash = [];

    // 先抽出行内代码,占位保存
    s = s.replace(/`([^`]+)`/g, function (_, code) {
      stash.push(code);
      return '\u0000' + (stash.length - 1) + '\u0000';
    });

    // 图片(必须在链接之前,否则 ![]() 会被链接规则吃掉)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) {
      return '<img src="' + escapeAttr(safeUrl(src)) + '" alt="' + escapeAttr(alt) + '" loading="lazy">';
    });

    // 链接
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
      var url = safeUrl(href);
      var external = /^https?:/i.test(url);
      var attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return '<a href="' + escapeAttr(url) + '"' + attrs + '>' + label + '</a>';
    });

    // 加粗
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // 斜体(用前后边界条件避开已生成的标签)
    s = s.replace(/(^|[^*\w>])\*([^*\n]+)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');

    // 还原行内代码
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, n) {
      return '<code>' + escapeHtml(stash[+n]) + '</code>';
    });

    return s;
  }

  /* ------------------------------------------------------------------
    块级 Markdown
     ------------------------------------------------------------------ */
  function splitRow(line) {
    return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(function (c) {
      return c.trim();
    });
  }

  function mdToHtml(md) {
    var lines = String(md).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var para = [];
    var i = 0;

    function flush() {
      if (para.length) {
        out.push('<p>' + inline(para.join(' ')) + '</p>');
        para = [];
      }
    }

    while (i < lines.length) {
      var line = lines[i];

      // 围栏代码块
      if (/^```/.test(line)) {
        flush();
        var lang = line.slice(3).trim();
        var buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push('<pre><code' + (lang ? ' class="lang-' + escapeAttr(lang) + '"' : '') + '>'
          + escapeHtml(buf.join('\n')) + '</code></pre>');
        continue;
      }

      // 标题
      var h = /^(#{1,4})\s+(.*)$/.exec(line);
      if (h) {
        flush();
        var lvl = h[1].length;
        out.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>');
        i++;
        continue;
      }

      // 分隔线
      if (/^\s*(?:[-*_])\s*(?:[-*_])\s*(?:[-*_])[\s\-*_]*$/.test(line)) {
        flush(); out.push('<hr>'); i++; continue;
      }

      // 引用
      if (/^>\s?/.test(line)) {
        flush();
        var quote = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^>\s?/, ''));
          i++;
        }
        out.push('<blockquote><p>' + inline(quote.join(' ')) + '</p></blockquote>');
        continue;
      }

      // 表格
      if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|\-]+\|\s*$/.test(lines[i + 1])) {
        flush();
        var head = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
        var t = '<table><thead><tr>';
        head.forEach(function (c) { t += '<th>' + inline(c) + '</th>'; });
        t += '</tr></thead><tbody>';
        rows.forEach(function (r) {
          t += '<tr>';
          r.forEach(function (c) { t += '<td>' + inline(c) + '</td>'; });
          t += '</tr>';
        });
        t += '</tbody></table>';
        out.push(t);
        continue;
      }

      // 无序列表
      if (/^\s*[-*+]\s+/.test(line)) {
        flush();
        var ul = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          ul.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
          i++;
        }
        out.push('<ul>' + ul.map(function (t2) { return '<li>' + inline(t2) + '</li>'; }).join('') + '</ul>');
        continue;
      }

      // 有序列表
      if (/^\s*\d+\.\s+/.test(line)) {
        flush();
        var ol = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          ol.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
          i++;
        }
        out.push('<ol>' + ol.map(function (t3) { return '<li>' + inline(t3) + '</li>'; }).join('') + '</ol>');
        continue;
      }

      // 空行
      if (/^\s*$/.test(line)) { flush(); i++; continue; }

      para.push(line.trim());
      i++;
    }

    flush();
    return out.join('\n');
  }

  /* ------------------------------------------------------------------
    日期与阅读时长
     ------------------------------------------------------------------ */
  var MONTHS = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月',
                '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'];

  function formatDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    if (!m) return String(iso || '');
    return m[1] + ' 年 ' + MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ' 日';
  }

  // 中文按字数、拉丁按词数分别估算,再加权
  function readingTime(md) {
    var text = String(md).replace(/```[\s\S]*?```/g, '');
    var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9']+/g) || []).length;
    var minutes = cjk / 340 + words / 200;
    return Math.max(1, Math.round(minutes));
  }

  /* ------------------------------------------------------------------
    数据
     ------------------------------------------------------------------ */
  function loadManifest() {
    return fetch('posts.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('posts.json 读取失败 (HTTP ' + r.status + ')');
      return r.json();
    }).then(function (data) {
      var posts = (data && data.posts) || [];
      return posts.slice().sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
    });
  }

  function loadPost(slug) {
    return fetch('posts/' + encodeURIComponent(slug) + '.md', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('文章不存在 (HTTP ' + r.status + ')');
      return r.text();
    });
  }

  /* ------------------------------------------------------------------
    渲染:首页文章索引
     ------------------------------------------------------------------ */
  function renderIndex() {
    var list = document.getElementById('post-list');
    if (!list) return;

    var countEl = document.getElementById('post-count');

    loadManifest().then(function (posts) {
      list.innerHTML = '';

      if (!posts.length) {
        list.outerHTML =
          '<div class="empty">' +
            '<h2 class="empty__title">还没有文章</h2>' +
            '<p class="empty__text">这里会按时间倒序列出所有文章。现在一篇都没有。</p>' +
            '<p class="empty__hint">想发第一篇:在 <code>posts/</code> 里新建一个 <code>.md</code> 文件,' +
            '再往 <code>posts.json</code> 加一条记录,刷新即可。</p>' +
          '</div>';
        if (countEl) countEl.textContent = '0 篇';
        return;
      }

      if (countEl) countEl.textContent = posts.length + ' 篇';

      var html = '';
      posts.forEach(function (p, idx) {
        var tags = (p.tags || []).map(function (t) {
          return '<span class="post-item__tag">' + escapeHtml(t) + '</span>';
        }).join('');

        html +=
          '<li class="post-item reveal" style="animation-delay:' + Math.min(idx * 45, 400) + 'ms">' +
            '<a class="post-item__link" href="post.html?p=' + encodeURIComponent(p.slug) + '">' +
              '<span class="post-item__date">' + escapeHtml(formatDate(p.date)) + '</span>' +
              '<span>' +
                '<span class="post-item__title">' + escapeHtml(p.title) + '</span>' +
                (p.summary ? '<span class="post-item__summary">' + escapeHtml(p.summary) + '</span>' : '') +
                (tags ? '<span class="post-item__meta">' + tags + '</span>' : '') +
              '</span>' +
            '</a>' +
          '</li>';
      });
      list.innerHTML = html;
    }).catch(function (err) {
      list.outerHTML =
        '<div class="error-box">' +
          '<p class="error-box__title">文章列表没能加载出来</p>' +
          '<p class="error-box__text">' + escapeHtml(err.message) + '</p>' +
          '<p class="error-box__text">如果你是在本地直接双击打开的 <code>index.html</code>,' +
          '浏览器会出于安全策略拦截读取文件。双击 <code>预览.bat</code> 用本地服务器打开即可。</p>' +
        '</div>';
    });
  }

  /* ------------------------------------------------------------------
    渲染:单篇文章
     ------------------------------------------------------------------ */
  function renderPost() {
    var host = document.getElementById('post');
    if (!host) return;

    var params = new URLSearchParams(location.search);
    var slug = params.get('p');

    if (!slug) {
      host.innerHTML =
        '<div class="error-box">' +
          '<p class="error-box__title">没指定要读哪一篇</p>' +
          '<p class="error-box__text">这个页面需要带上文章标识,比如 <code>post.html?p=hello</code>。</p>' +
          '<p class="error-box__text"><a href="index.html">回到文章列表</a></p>' +
        '</div>';
      return;
    }

    loadManifest().then(function (posts) {
      var idx = -1;
      for (var k = 0; k < posts.length; k++) {
        if (posts[k].slug === slug) { idx = k; break; }
      }
      if (idx === -1) throw new Error('没有找到标识为 “' + slug + '” 的文章');

      var meta = posts[idx];
      return loadPost(slug).then(function (md) {
        paintPost(meta, md, posts[idx - 1], posts[idx + 1]);
      });
    }).catch(function (err) {
      host.innerHTML =
        '<div class="error-box">' +
          '<p class="error-box__title">这篇没能打开</p>' +
          '<p class="error-box__text">' + escapeHtml(err.message) + '</p>' +
          '<p class="error-box__text"><a href="index.html">回到文章列表</a></p>' +
        '</div>';
    });
  }

  function paintPost(meta, md, prev, next) {
    var host = document.getElementById('post');
    var tags = (meta.tags || []).map(function (t) { return escapeHtml(t); }).join(' · ');

    var html =
      '<header class="article__header reveal">' +
        (tags ? '<p class="article__eyebrow">' + tags + '</p>' : '') +
        '<h1 class="article__title">' + escapeHtml(meta.title) + '</h1>' +
        '<div class="article__meta">' +
          '<span>' + escapeHtml(formatDate(meta.date)) + '</span>' +
          '<span class="dot">·</span>' +
          '<span>约 ' + readingTime(md) + ' 分钟读完</span>' +
        '</div>' +
      '</header>' +
      '<div class="prose reveal" style="animation-delay:80ms">' + mdToHtml(md) + '</div>';

    var nav = '';
    if (prev) {
      nav += '<a href="post.html?p=' + encodeURIComponent(prev.slug) + '">' +
               '<span>上一篇</span><span>' + escapeHtml(prev.title) + '</span></a>';
    }
    if (next) {
      nav += '<a href="post.html?p=' + encodeURIComponent(next.slug) + '">' +
               '<span>下一篇</span><span>' + escapeHtml(next.title) + '</span></a>';
    }
    if (nav) html += '<nav class="article__foot reveal" style="animation-delay:140ms">' + nav + '</nav>';

    host.innerHTML = html;

    document.title = meta.title + ' · AlexYang';
    var desc = document.querySelector('meta[name="description"]');
    if (desc && meta.summary) desc.setAttribute('content', meta.summary);
  }

  /* ------------------------------------------------------------------
    启动
     ------------------------------------------------------------------ */
  function boot() {
    var page = document.body.getAttribute('data-page');
    if (page === 'index') renderIndex();
    if (page === 'post') renderPost();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
