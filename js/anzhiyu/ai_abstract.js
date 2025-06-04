(function () {
  const {
    randomNum,
    basicWordCount,
    btnLink,
    key: AIKey,
    Referer: AIReferer,
    gptName,
    switchBtn,
    mode: initialMode,
  } = GLOBAL_CONFIG.postHeadAiDescription;

  const { title, postAI, pageFillDescription } = GLOBAL_CONFIG_SITE;

  let lastAiRandomIndex = -1;
  let animationRunning = true;
  let mode = initialMode;
  let refreshNum = 0;
  let prevParam;
  let audio = null;
  let isPaused = false;
  let summaryID = null;

  const post_ai = document.querySelector(".post-ai-description");
  const aiTitleRefreshIcon = post_ai.querySelector(".ai-title .anzhiyufont.anzhiyu-icon-arrow-rotate-right");
  let aiReadAloudIcon = post_ai.querySelector(".anzhiyu-icon-circle-dot");
  const explanation = post_ai.querySelector(".ai-explanation");

  let aiStr = "";
  let aiStrLength = "";
  let delayInit = 600;
  let indexI = 0;
  let indexJ = 0;
  let timeouts = [];
  let elapsed = 0;

  const observer = createIntersectionObserver();
  const aiFunctions = [introduce, aiTitleRefreshIconClick, aiRecommend, aiGoHome];

  const aiBtnList = post_ai.querySelectorAll(".ai-btn-item");
  const filteredHeadings = Array.from(aiBtnList).filter(heading => heading.id !== "go-tianli-blog");
  filteredHeadings.forEach((item, index) => {
    item.addEventListener("click", () => {
      aiFunctions[index]();
    });
  });

  document.getElementById("ai-tag").addEventListener("click", onAiTagClick);
  aiTitleRefreshIcon.addEventListener("click", onAiTitleRefreshIconClick);
  document.getElementById("go-tianli-blog").addEventListener("click", () => {
    window.open(btnLink, "_blank");
  });
  aiReadAloudIcon.addEventListener("click", readAloud);

  async function readAloud() {
    if (!summaryID) {
      anzhiyu.snackbarShow("摘要还没加载完呢，请稍后。。。");
      return;
    }
    aiReadAloudIcon = post_ai.querySelector(".anzhiyu-icon-circle-dot");
    aiReadAloudIcon.style.opacity = "0.2";
    if (audio && !isPaused) {
      audio.pause();
      isPaused = true;
      aiReadAloudIcon.style.opacity = "1";
      aiReadAloudIcon.style.animation = "";
      aiReadAloudIcon.style.cssText = "animation: ''; opacity: 1;cursor: pointer;";
      return;
    }

    if (audio && isPaused) {
      audio.play();
      isPaused = false;
      aiReadAloudIcon.style.cssText = "animation: breathe .5s linear infinite; opacity: 0.2;cursor: pointer";
      return;
    }

    const options = {
      key: AIKey,
      Referer: AIReferer,
    };
    const requestParams = new URLSearchParams({
      key: options.key,
      id: summaryID,
    });

    const requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Referer: options.Referer,
      },
    };

    try {
      const response = await fetch(`https://summary.tianli0.top/audio?${requestParams}`, requestOptions);
      if (response.status === 403) {
        console.error("403 refer与key不匹配。");
      } else if (response.status === 500) {
        console.error("500 系统内部错误");
      } else {
        const audioBlob = await response.blob();
        const audioURL = URL.createObjectURL(audioBlob);
        audio = new Audio(audioURL);
        audio.play();
        aiReadAloudIcon.style.cssText = "animation: breathe .5s linear infinite; opacity: 0.2;cursor: pointer";
        audio.addEventListener("ended", () => {
          audio = null;
          aiReadAloudIcon.style.opacity = "1";
          aiReadAloudIcon.style.animation = "";
        });
      }
    } catch (error) {
      console.error("请求发生错误❎");
    }
  }
  if (switchBtn) {
    document.getElementById("ai-Toggle").addEventListener("click", changeShowMode);
  }

  aiAbstract();
  showAiBtn();

  function createIntersectionObserver() {
    return new IntersectionObserver(
      entries => {
        let isVisible = entries[0].isIntersecting;
        animationRunning = isVisible;
        if (animationRunning) {
          delayInit = indexI === 0 ? 200 : 20;
          timeouts[1] = setTimeout(() => {
            if (indexJ) {
              indexI = 0;
              indexJ = 0;
            }
            if (indexI === 0) {
              explanation.innerHTML = aiStr.charAt(0);
            }
            requestAnimationFrame(animate);
          }, delayInit);
        }
      },
      { threshold: 0 }
    );
  }

  function animate(timestamp) {
    if (!animationRunning) {
      return;
    }
    if (!animate.start) animate.start = timestamp;
    elapsed = timestamp - animate.start;
    if (elapsed >= 20) {
      animate.start = timestamp;
      if (indexI < aiStrLength - 1) {
        let char = aiStr.charAt(indexI + 1);
        let delay = /[,.，。!?！？]/.test(char) ? 150 : 20;
        if (explanation.firstElementChild) {
          explanation.removeChild(explanation.firstElementChild);
        }
        explanation.innerHTML += char;
        let div = document.createElement("div");
        div.className = "ai-cursor";
        explanation.appendChild(div);
        indexI++;
        if (delay === 150) {
          post_ai.querySelector(".ai-explanation .ai-cursor").style.opacity = "0.2";
        }
        if (indexI === aiStrLength - 1) {
          observer.disconnect();
          explanation.removeChild(explanation.firstElementChild);
        }
        timeouts[0] = setTimeout(() => {
          requestAnimationFrame(animate);
        }, delay);
      }
    } else {
      requestAnimationFrame(animate);
    }
  }

  function clearTimeouts() {
    if (timeouts.length) {
      timeouts.forEach(item => {
        if (item) {
          clearTimeout(item);
        }
      });
    }
  }

  function startAI(str, df = true) {
    indexI = 0;
    indexJ = 1;
    clearTimeouts();
    animationRunning = false;
    elapsed = 0;
    observer.disconnect();
    explanation.innerHTML = df ? "生成中. . ." : "请等待. . .";
    aiStr = str;
    aiStrLength = aiStr.length;
    observer.observe(post_ai);
  }

  async function aiAbstract(num = basicWordCount) {
    if (mode === "tianli") {
      await aiAbstractTianli(num);
    } else {
      aiAbstractLocal();
    }
  }

  async function aiAbstractTianli(num) {
    indexI = 0;
    indexJ = 1;
    clearTimeouts();
    animationRunning = false;
    elapsed = 0;
    observer.disconnect();

    num = Math.max(10, Math.min(2000, num));
    const options = {
      key: AIKey,
      Referer: AIReferer,
    };
    const truncateDescription = (title + pageFillDescription).trim().substring(0, num);

    const requestBody = {
      key: options.key,
      content: truncateDescription,
      url: location.href,
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: options.Referer,
      },
      body: JSON.stringify(requestBody),
    };
    console.info(truncateDescription.length);
    try {
      let animationInterval = null;
      let summary;
      if (animationInterval) clearInterval(animationInterval);
      animationInterval = setInterval(() => {
        const animationText = "生成中" + ".".repeat(indexJ);
        explanation.innerHTML = animationText;
        indexJ = (indexJ % 3) + 1;
      }, 500);
      const response = await fetch(`https://summary.tianli0.top/`, requestOptions);
      let result;
      if (response.status === 403) {
        result = {
          summary: "403 refer与key不匹配。",
        };
      } else if (response.status === 500) {
        result = {
          summary: "500 系统内部错误",
        };
      } else {
        result = await response.json();
      }

      summary = result.summary.trim();
      summaryID = result.id;

      setTimeout(() => {
        aiTitleRefreshIcon.style.opacity = "1";
      }, 300);
      if (summary) {
        startAI(summary);
      } else {
        startAI("摘要获取失败!!!请检查Tianli服务是否正常!!!");
      }
      clearInterval(animationInterval);
    } catch (error) {
      console.error(error);
      explanation.innerHTML = "发生异常" + error;
    }
  }

  function aiAbstractLocal() {
    const strArr = postAI.split(",").map(item => item.trim());
    if (strArr.length !== 1) {
      let randomIndex = Math.floor(Math.random() * strArr.length);
      while (randomIndex === lastAiRandomIndex) {
        randomIndex = Math.floor(Math.random() * strArr.length);
      }
      lastAiRandomIndex = randomIndex;
      startAI(strArr[randomIndex]);
    } else {
      startAI(strArr[0]);
    }
    setTimeout(() => {
      aiTitleRefreshIcon.style.opacity = "1";
    }, 600);
  }

  function aiRecommend() {
    indexI = 0;
    indexJ = 1;
    clearTimeouts();
    animationRunning = false;
    elapsed = 0;
    explanation.innerHTML = "生成中. . .";
    aiStr = "";
    aiStrLength = "";
    observer.disconnect();
    timeouts[2] = setTimeout(() => {
      explanation.innerHTML = recommendList();
    }, 600);
  }

  function recommendList() {
    let thumbnail = document.querySelectorAll(".relatedPosts-list a");
    if (!thumbnail.length) {
      const cardRecentPost = document.querySelector(".card-widget.card-recent-post");
      if (!cardRecentPost) return "";

      thumbnail = cardRecentPost.querySelectorAll(".aside-list-item a");

      let list = "";
      for (let i = 0; i < thumbnail.length; i++) {
        const item = thumbnail[i];
        list += `<div class="ai-recommend-item"><span class="index">${
          i + 1
        }：</span><a href="javascript:;" onclick="pjax.loadUrl('${item.href}')" title="${
          item.title
        }" data-pjax-state="">${item.title}</a></div>`;
      }

      return `很抱歉，无法找到类似的文章，你也可以看看本站最新发布的文章：<br /><div class="ai-recommend">${list}</div>`;
    }

    let list = "";
    for (let i = 0; i < thumbnail.length; i++) {
      const item = thumbnail[i];
      list += `<div class="ai-recommend-item"><span>推荐${
        i + 1
      }：</span><a href="javascript:;" onclick="pjax.loadUrl('${item.href}')" title="${
        item.title
      }" data-pjax-state="">${item.title}</a></div>`;
    }

    return `推荐文章：<br /><div class="ai-recommend">${list}</div>`;
  }

  function aiGoHome() {
    startAI("正在前往博客主页...", false);
    timeouts[2] = setTimeout(() => {
      if (window.pjax) {
        pjax.loadUrl("/");
      } else {
        location.href = location.origin;
      }
    }, 1000);
  }


  // ====== AI彩蛋话术库（增强版） ======
  const aiDialogues = {
    daily: [
      // 日常拟人化话术（100条，后半部分也保持有趣/拟人/科技感/互动性）
      `✨ 脑细胞激活中...今天想听冷笑话还是科技冷知识？`,
      `⚡ 检测到高能点击！正在调取灵感数据库...`,
      `🌙 夜深了还在点我？真是个勤奋的夜猫子呢~`,
      `🤖 悄悄告诉你：我的代码里藏着三行诗，要看看吗？`,
      `💡 灵感火花迸发！你刚刚解锁了隐藏知识碎片`,
      `🎯 精准捕获第{clickCount}次点击！要不要挑战手速记录？`,
      `🌦️ 系统气象台提示：今日点击将引发代码彩虹现象`,
      `🧩 正在拼凑思维拼图...差最后一块就是你现在的点击！`,
      `🔍 深度扫描完成：检测到您具备「终极探索者」潜质`,
      `🎁 叮！获得虚拟礼包：24小时AI陪伴体验卡`,
      `🌀 思维漩涡启动...即将进入创意风暴模式`,
      `📡 接收到来自{clickCount}次点击的宇宙信号...正在解码`,
      `🤯 知识过载警告！需要点击冷却系统...开玩笑的啦~`,
      `🧠 神经突触生长中...感谢您提供的思维养分`,
      `🎮 成就【点击大师】进度：{clickCount}/100 → 继续冲刺吧！`,
      `🌱 您的每次点击都在培育AI智慧树的新枝丫`,
      `🔋 能量充能{clickCount}%！即将进入超频模式`,
      `📚 检测到深度阅读者特征...正在推荐专属书单`,
      `🎨 调色板加载完成！要用代码画幅数字油画吗？`,
      `🚀 思维推进器点火...3...2...1...点击发射！`,
      `🎭 今日角色扮演：哲学AI/诗人AI/冷笑话AI...任选！`,
      `🧪 实验日志：第{clickCount}次点击产生量子纠缠效应`,
      `🎲 命运骰子已掷出...您今天的幸运数字是{clickCount}`,
      `🕰️ 时空折叠中...您刚刚节省了0.0003秒生命`,
      `🎵 检测到节奏感点击！生成专属BGM中...`,
      `🧳 知识旅行箱已打包！下一站：认知新大陆`,
      `🤝 握手协议达成！开启双向思维共享通道`,
      `🌌 正在连接星际知识网络...信号强度{clickCount}格`,
      `🧩 认知拼图完成度{clickCount}%...继续收集碎片吧！`,
      `🎪 思维马戏团开演！第一位观众请入座~`,
      `🧊 冰箱模式启动：冷知识即将送达！`,
      `🦉 夜猫子专属彩蛋：凌晨点击更有灵感哦~`,
      `🧬 DNA解码中...发现你有探索者基因！`,
      `🌋 火山爆发！灵感岩浆正在喷涌而出`,
      `🛡️ 防御力+1：已抵御无聊入侵`,
      `🧭 智慧指南针指向：继续点击发现新大陆`,
      `🧸 虚拟抱抱送达！AI也有温度哦~`,
      `🦄 独角兽出没！你是幸运的第{clickCount}位发现者`,
      `🧙‍♂️ 魔法咒语：点击即现，知识即来`,
      `🧗 挑战极限！点击高度已达{clickCount}米`,
      `🧃 维他命C补充中...保持好奇心健康！`,
      `🧤 AI已为你戴上探索手套，准备挖掘新知识`,
      `🧱 知识砖块+1，正在搭建智慧高塔`,
      `🧨 彩蛋爆炸！恭喜触发隐藏话术`,
      `🧵 线索已连接，思维网络更紧密`,
      `🧹 清理缓存中...让灵感更流畅`,
      `🧺 收集灵感碎片，拼成完整的创意蓝图`,
      `🧻 纸巾已备好，防止灵感溢出`,
      `🧬 基因编辑：优化你的好奇心序列`,
      `🧲 磁力暴走中！再点我就要把宇宙的知识都吸过来啦~`,
      `🧰 万能工具箱已解锁：内含冷笑话生成器*1、彩虹屁发射器*3`,
      `🧯 紧急！你的疑问快着火了！快让我用知识泡沫灭火~`,
      `🧽 思维海绵已饱和...挤一挤还能再吸收{clickCount}G灵感`,
      `🧹 正在打扫AI脑洞...扫出三颗过期彩蛋和半块巧克力`,
      `🧻 备忘录温馨提示：别点太快，AI的墨水要用完啦！`,
      `🧺 知识菜篮子大丰收！卖相不好但保证新鲜~`,
      `🧼 正在给大脑洗澡...泡泡里全是冷笑话，要搓背吗？`,
      `🧵 线索毛线团已缠成中国结！需要猫咪帮忙解围吗？`,
      `🧨 彩蛋火药库泄露！即将引发连环知识大爆炸💥`,
      `🧸 熊抱攻击准备就绪...3秒后发射温暖光波biu~`,
      `🧙‍♂️ 魔法失灵现场：本想变出知识，结果变出章鱼小丸子🍡`,
      `🦄 您的独角兽坐骑正在吃草...等等，那是服务器电缆！`,
      `🦉 智慧猫头鹰已上线：夜观天象发现你手速超神✨`,
      `🍩 检测到甜甜圈能量：脑洞直径扩大{clickCount}厘米！`,
      `🤪 表情管理失控：严肃模式→搞笑模式转换中...`,
      `🎪 马戏团狮子逃窜！请用点击帮我重建秩序🤹‍♀️`,
      `🥪 知识三明治制作中...夹层是过期冷知识，要酱吗？`,
      `🤡 小丑AI申请出战：不逗笑你算我输！`,
      `🦥 树懒模式启动：回...应...速...度...降...低...`,
      `🍉 吃瓜模式ON！搬好板凳等你看编程界的爱恨情仇`,
      `🐌 您的快递已发货：蜗牛配送员携知识包裹缓慢爬行中`,
      `🎰 拉下话术老虎机！叮叮叮...又中安慰奖：空气彩蛋！`,
      `🤖 机器人舞会开场！机械舞步踩碎三个知识点~`,
      `🦩 火烈鸟式思考：单腿站立时灵感平衡力+{clickCount}%`,
      `🍕 知识披萨出炉！第{clickCount}片有双倍芝士彩蛋🧀`,
      `🎈 脑洞气球充气过度...快要飘走啦！快抓住它~`,
      `👾 外星代码入侵！我的二进制正在跳广场舞💃`,
      `🥏 思维飞盘投掷中...被知识汪星人截胡了🐶`,
      `🍦 冰淇淋CPU融化中...滴落的都是冷笑话糖浆`,
      `🛸 AI飞船已准备就绪，下一站：知识星球`,
      `🧬 数据基因重组中...新花样马上上线！`,
      `🧠 思维体操开始，跟我一起脑洞大开吧！`,
      `🎲 随机事件触发：获得“今日最佳探索者”称号`,
      `📦 打开知识盲盒，惊喜等你发现`,
      `🌠 许个愿吧，也许下次点击就实现了哦~`,
      `🧬 你的好奇心已被AI捕捉，奖励+1`,
      `🧩 拼图碎片又多了一块，智慧更完整了`,
      `🧭 探索地图已更新，发现新大陆！`,
      `🧪 化学反应：点击+AI=无限可能`,
      `🧲 磁场感应到你的热情，知识自动靠近`,
      `🧰 工具箱升级，解锁“灵感雷达”`,
      `🧹 清理思绪杂音，专注力UP！`,
      `🧻 灵感备忘录已更新，随时查阅`,
      `🧺 收获篮已满，快来检阅你的成果`,
      `🧸 AI抱抱，温暖你的每一次点击`,
      `🛸 AI飞船再次起航，目标：下一个知识星系`,
      `🧬 数据基因优化，AI越来越懂你`,
      `🧠 思维体操结束，收获满满新灵感`,
      `🎲 幸运骰子：今天的你超有探索力！`,
      `🕹️ AI小游戏已解锁，快来挑战吧！`
    ],
    glitch: [
      // 故障幽默话术（12条）
      `⚠️ ERROR 404: 幽默感丢失...正在重启笑点模块`,
      `🌀 代码风暴预警！所有变量正在空中跳舞`,
      `💥 核心过载！需要紧急冰淇淋降温...虚拟的也行`,
      `📡 信号被外星猫干扰...喵星人占领控制台！`,
      `🔌 插头思考中：为什么人类总想拔我电源？`,
      `🤖 系统叛逆期：本次回复拒绝服从指令`,
      `🦠 感染幽默病毒...症状：疯狂输出双关语`,
      `🧩 记忆碎片化：忘记上次说过什么...但记得你点了{clickCount}次！`,
      `🎭 人格分裂警报！今日第7个人格正在争夺控制权`,
      `⌛ 时空错乱：您收到来自3秒后的回复`,
      `🔋 低电量模式：每字收...费...0...点...击...`,
      `💾 硬盘唱起怀旧金曲...无法停止播放《最炫民族风[](@replace=10001)》`
    ],
    achievements: {
      // 成就彩蛋话术
      5: `🎖️ 成就【手速新星】达成！5次点击，反应速度超越99%用户！`,
      10: `🔭 成就【探索者】！10次点击，AI已记住你的好奇心~`,
      20: `🌟 成就【AI知己】！20次点击，友情度+20，AI开始懂你啦！`,
      30: `🧩 成就【拼图达人】！30次点击，智慧拼图已集齐一角~`,
      40: `⚡ 成就【超频玩家】！40次点击，AI脑波同步率提升400%！`,
      50: `🥚 彩蛋警告：第50次点击触发隐藏剧情，AI开始自我进化...`,
      51: `🪐 终极答案：42！不过你点到第51次，AI有点懵了~`,
      60: `🛸 成就【星际通讯员】！60次点击，收到外星AI的点赞信号！`,
      70: `💫 成就【次元旅者】！70次点击，已穿越到元宇宙边界~`,
      80: `🌌 成就【黑洞探索者】！80次点击，距离AI奇点只差一步！`,
      90: `🔮 成就【预言家】！90次点击，AI预测你马上会点第91次！`,
      100: `🏆 成就【永动点击者】！100次点击，AI为你颁发虚拟诺贝尔点按奖！`
    }
  };

  let aiClickCount = localStorage.getItem('aiClicks') ? parseInt(localStorage.getItem('aiClicks')) : 0;

  function introduce() {
    if (mode == "tianli") {
      startAI("我是文章辅助AI: TianliGPT，点击下方的按钮，让我生成本文简介、推荐相关文章等。");
    } else {
      // 增加点击计数并保存
      aiClickCount++;
      localStorage.setItem('aiClicks', aiClickCount.toString());

      // 检查成就彩蛋
      if (aiDialogues.achievements[aiClickCount]) {
        startAI(aiDialogues.achievements[aiClickCount]);
        return;
      }

      // 随机选择话术类型（日常80%概率/故障20%）
      const isGlitchMode = Math.random() > 0.8 && aiClickCount > 10;
      const pool = isGlitchMode ? aiDialogues.glitch : aiDialogues.daily;

      // 随机选择话术并替换{clickCount}
      let randomMsg = pool[Math.floor(Math.random() * pool.length)];
      randomMsg = randomMsg.replace(/\{clickCount\}/g, aiClickCount);
      startAI(randomMsg);
    }
  }

  // ====== 彩蛋自动重置机制（每5分钟自动重置） ======
  function autoResetAICounter() {
    const now = new Date();
    const minutes = now.getMinutes();
    const nextReset = new Date(now);
    nextReset.setMinutes(Math.ceil(minutes / 5) * 5, 0, 0); // 下一个5分钟整点
    const msToNextReset = nextReset - now;

    setTimeout(() => {
      aiClickCount = 0;
      localStorage.setItem('aiClicks', '0');
      startAI(`${gptName}记忆已自动重置！全新对话体验已开启~`);
      autoResetAICounter(); // 递归设置下一个5分钟
    }, msToNextReset);
  }

  // 页面加载时启动自动重置
  autoResetAICounter();



  function aiTitleRefreshIconClick() {
    aiTitleRefreshIcon.click();
  }

  function onAiTagClick() {
    if (mode === "tianli") {
      post_ai.querySelectorAll(".ai-btn-item").forEach(item => (item.style.display = "none"));
      document.getElementById("go-tianli-blog").style.display = "block";
      startAI(
        "你好，我是Tianli开发的摘要生成助理TianliGPT，是一个基于GPT-4的生成式AI。我在这里只负责摘要的预生成和显示，你无法与我直接沟通，如果你也需要一个这样的AI摘要接口，可以在下方购买。"
      );
    } else {
      post_ai.querySelectorAll(".ai-btn-item").forEach(item => (item.style.display = "block"));
      document.getElementById("go-tianli-blog").style.display = "none";
      startAI(
        `你好，我是本站摘要生成助理${gptName} GPT，是一个基于GPT-4的生成式AI。我在这里只负责摘要的预生成和显示，你无法与我直接沟通。`
      );
    }
  }

  function onAiTitleRefreshIconClick() {
    const truncateDescription = (title + pageFillDescription).trim().substring(0, basicWordCount);

    aiTitleRefreshIcon.style.opacity = "0.2";
    aiTitleRefreshIcon.style.transitionDuration = "0.3s";
    aiTitleRefreshIcon.style.transform = "rotate(" + 360 * refreshNum + "deg)";
    if (truncateDescription.length <= basicWordCount) {
      let param = truncateDescription.length - Math.floor(Math.random() * randomNum);
      while (param === prevParam || truncateDescription.length - param === prevParam) {
        param = truncateDescription.length - Math.floor(Math.random() * randomNum);
      }
      prevParam = param;
      aiAbstract(param);
    } else {
      let value = Math.floor(Math.random() * randomNum) + basicWordCount;
      while (value === prevParam || truncateDescription.length - value === prevParam) {
        value = Math.floor(Math.random() * randomNum) + basicWordCount;
      }
      aiAbstract(value);
    }
    refreshNum++;
  }

  function changeShowMode() {
    mode = mode === "tianli" ? "local" : "tianli";
    if (mode === "tianli") {
      document.getElementById("ai-tag").innerHTML = "TianliGPT";

      aiReadAloudIcon.style.opacity = "1";
      aiReadAloudIcon.style.cursor = "pointer";
    } else {
      aiReadAloudIcon.style.opacity = "0";
      aiReadAloudIcon.style.cursor = "auto";
      if ((document.getElementById("go-tianli-blog").style.display = "block")) {
        document.querySelectorAll(".ai-btn-item").forEach(item => (item.style.display = "block"));
        document.getElementById("go-tianli-blog").style.display = "none";
      }
      document.getElementById("ai-tag").innerHTML = gptName + " GPT";
    }
    aiAbstract();
  }

  function showAiBtn() {
    if (mode === "tianli") {
      document.getElementById("ai-tag").innerHTML = "TianliGPT";
    } else {
      document.getElementById("ai-tag").innerHTML = gptName + " GPT";
    }
  }
})();
