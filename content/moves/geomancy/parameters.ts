/**
 * 大地掌控 / geomancy 的参数与数值来源。
 *
 * 原生事实：Fairy、变化、威力 —、命中必中、PP 10、目标 self，
 *   flags 含 charge（第 1 回合蓄力、第 2 回合发动），boosts { spa: +2, spd: +2, spe: +2 }。
 *
 * 翻译：把「第1回合吸收能量，第2回合大幅提高」翻成真的**两拍**——把身体扎进大地、从地脉吸取能量：
 *   一圈地纹在脚下张开、顺着裂缝把光抽上来，使用者一动不动地立在阵心；能量吸满的下一刻地纹亮透，
 *   能量反冲回身体，特攻、特防、速度同时大涨。蓄力期间若被睡得/冻住、或蓄力窗口被提前清除，能量半途崩散、什么也拿不到。
 * 取原生「三攻三防项各 +2、PP 10、两回合」；放弃回合制里的等待回合——这里的第一拍是**插在地上的一段可见蓄力**，
 * 第二拍是地纹炸开的一刻。它是这一族里唯一的**两拍蓄力**，也是唯一把自己钉在地上、并在场上留下一圈纯表现地纹
 * （不替换草地苔石）的一招。
 *
 * 数值来源（每一项读不同的精灵数据或现场事实，分散到不同参数）：
 *   gift    固定 2 级：原生「大幅提高」的对位，是这招的身份而不是成长点。
 *   absorb  基础 40 刻 − 速度 ×0.1，夹 24..54：腿快的个体吸得更快。
 *   circle  基础 1.8 格 + 碰撞箱宽度 ×1.2 + 碰撞箱高度 ×0.4，夹 1.5..3.6：身板越大阵张得越开。
 *   runes   基础 20 + 特攻 ×0.2 + 等级 ×0.5，夹 18..64：特攻与等级越高，地纹里的光点越密。
 *   rise    基础 0.05 格/刻 + 特攻 /2000，夹 0.04..0.12：特攻越高，能量上升得越急。
 *   linger  基础 40 刻 + 碰撞箱高度 ×6，夹 30..60：爆发后的地纹余光按这个独立寿命留在原地。
 *   tempo   基础 10 刻 − 速度偏移，夹 6..14。
 *   aftercast 基础 8 刻 + 碰撞箱高度 ×1.5，夹 8..12。
 *   wait    基础 120 刻 − 等级 ×0.5，夹 90..140。PP 10 的代价。
 */
namespace PokemonSkills {
    actionParameters.define("geomancy", {
        /** 大地掌控增益：原生特攻、特防、速度各 +2。 */
        gift: formula(F.const(2), "掌控增益", {
            unit: " 级",
            description: "地脉能量反冲时把特攻、特防、速度各抬高多少级；原生「大幅提高」的对位。"
        }),
        /** 蓄力时长：速度决定地脉吸得多快。 */
        absorb: seconds(F.base(40).minus(F.stat("speed").times(0.1)).clamp(24, 54).round(0),
            "蓄力时长", "把身体扎进大地、吸满能量需要多久；速度越高吸得越快。这段时间立定不动，也最怕被控住。"),
        /** 阵心半径：身板越大阵张得越开。 */
        circle: formula(
            F.base(1.8).plus(F.body("width").times(1.2)).plus(F.body("height").times(0.4)).clamp(1.5, 3.6).round(2),
            "阵心半径", {
                unit: " 格",
                description: "脚下地纹张开的半径；身板越大张得越开。判定与表现读同一个半径。"
            }),
        /** 地纹光点：特攻与等级派生。 */
        runes: formula(
            F.base(20).plus(F.stat("specialAttack").times(0.2)).plus(F.level().times(0.5)).clamp(18, 64).round(0),
            "地纹光点", {
                unit: " 点",
                description: "蓄力时从地面升起的光点粒子总数；特攻与等级越高越密，画面里的数量与机制一致。"
            }),
        /** 能量上升速度：特攻决定。 */
        rise: formula(
            F.base(0.05).plus(F.stat("specialAttack").div(2000)).clamp(0.04, 0.12).round(3),
            "能量上升", {
                unit: " 格/刻",
                description: "地脉能量从地面升向身体的快慢；特攻越高升得越急。"
            }),
        /** 地纹余光：爆发后还在多久。 */
        linger: seconds(
            F.base(40).plus(F.body("height").times(6)).clamp(30, 60).round(0),
            "地纹余光", "能量爆发后地纹余光还在地上亮多久；身板越大留得越久，这是余波自己的寿命。"),
        /** 起式：速度决定扎地多快。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03)).clamp(6, 14).round(0),
            "起式", "定身、扎进大地需要多久；速度越高越快。"),
        /** 收招：身板越大越慢。 */
        aftercast: seconds(
            F.base(8).plus(F.body("height").times(1.5)).clamp(8, 12).round(0),
            "收招", "爆发后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5)).clamp(90, 140).round(0),
            "冷却", "两次大地掌控之间的等待；等级越高越短。PP 10 的代价。")
    });

    stages("geomancy", [
        { level: 40, values: { wait: 108 } },
        { level: 60, values: { wait: 96 } }
    ]);

    describe("geomancy", [
        { key: "description.0", values: ["gift"] },
        { key: "description.1", values: ["absorb"] },
        { key: "description.2", values: [] },
        { key: "description.3", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wait"] }
    ]);
}
