/**
 * 巨声 / hypervoice 的参数与伤害段。
 *
 * 原生事实：Normal／特殊／威力 90／命中 100／PP 10／优先度 0／flags sound+bypasssub／
 *   target allAdjacentFoes（自己周围所有对手）／无次要效果；是「又吵又响的巨大震动」的一声吼。
 *
 * 翻译：把「响彻全场的吼叫」翻成**一整片朝前压出去的声墙**——施法者扎住脚，深吸一口气，把一声咆哮
 *   沿着正前方的扇形整片推出去：扇面里每个活体（不看地面、不看掩体）被同一堵声墙轰中，几乎不分远近
 *   （本招的边缘保留远高于同族），并被沿声墙前进方向直直推回去；代价是吼完要喘很久。
 *   与同族分开：
 *     爆音波（boomburst）—— 以自己为圆心整圈炸开、最重、会聋到施法者自己；
 *     虫鸣（bugbuzz）   —— 近距离锥形、越远越弱、概率碾特防；
 *     魅惑之声（disarmingvoice）—— 以自己为心的整圈声场、必定命中、降速；
 *     巨声（本招）      —— 最宽的一道前扇形、几乎不衰减、把整片人朝前推，唯一没有附加状态的一声。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   blast       爆发威力 88 + 特攻偏移 + 等级偏移（嗓门越大越响）；聚声 ×1.08 / 散声 ×0.94。
 *   falloff     边缘保留 0.85 + 特攻偏移（特攻越高声压越均匀），本族最高。
 *   arc         扇面张角 100° + 体重偏移 + 等级偏移（身体越沉、喉腔越厚，声音铺得越宽）；聚声 ×0.6 / 散声 ×1.3。
 *   reach       声墙长度 7.2 + 身高偏移 + 等级偏移；聚声 ×1.25 / 散声 ×0.85。
 *   push        向外推 0.55 格 + 特攻偏移；聚声 ×1.15 / 散声 ×0.8。
 *   tempo       起手随速度；聚声 +2 刻（把声音收进一条）。
 *   settle      收招 12 刻 + 身高偏移（身板大收得慢）。
 *   recharge    冷却随速度；聚声 +4 刻。
 *
 * 配置 `focused`（聚声）：开启＝张角收到 0.6 倍、射程 ×1.25、击退 ×1.15、威力 ×1.08，起手 +2、冷却 +4，
 *   把一声吼收成一条更远更重的声柱；关闭（散声）＝张角 ×1.3、威力略小，用来一次覆盖一整个方向。
 *   两向各有局面：要够远处的硬目标就聚声，要扫一片就散声。
 *
 * 伤害段 `blast` 与参数同名，走共享换算（原生类别 Special）。
 */
namespace PokemonSkills {
    actionParameters.define("hypervoice", {
        /** 爆发威力：88 + 特攻偏移[−20,55] + 等级(≥30)偏移[0,12]；聚声 ×1.08 / 散声 ×0.94；夹 60..220。 */
        blast: formula(
            F.base(88)
                .plus(F.stat("specialAttack").minus(70).times(0.35).clamp(-20, 55))
                .plus(F.level().minus(30).times(0.2).clamp(0, 12))
                .times(F.when(F.pref("focused"), F.const(1.08), F.const(0.94)))
                .clamp(60, 220).round(1),
            "爆发威力", {
                unit: "威力",
                description: "声墙扫过时对每个敌人的基础威力；特攻越高、等级越高越响。离得远的只会被边缘保留削一点；对手特防、相性与暴击在命中时另算。"
            }),
        /** 边缘保留：0.85 + 特攻偏移[−0.08,0.1]；夹 0.72..0.96。本族最高，读作「远近几乎一样重」。 */
        falloff: percent(
            F.base(0.85).plus(F.stat("specialAttack").minus(70).times(0.0008).clamp(-0.08, 0.1)).clamp(0.72, 0.96).round(3),
            "边缘保留", "声墙推到扇形最外沿时还剩多少威力；特攻越高的个体声压越匀、前后越一致。它比同族任何一声都高，这是巨声「远近都挨一样重」的来源。"),
        /** 扇面张角：100° + 体重偏移[−22,46] + 等级(≥30)偏移[0,10]；聚声 ×0.6 / 散声 ×1.3；夹 40..200。 */
        arc: formula(
            F.base(100)
                .plus(F.body("weight").minus(400).times(0.03).clamp(-22, 46))
                .plus(F.level().minus(30).times(0.2).clamp(0, 10))
                .times(F.when(F.pref("focused"), F.const(0.6), F.const(1.3)))
                .clamp(40, 200).round(1),
            "扇面张角", {
                unit: "度",
                description: "声墙朝前铺开的整片角度；身体越沉、等级越高的个体喉腔越厚、铺得越宽，聚声时把这一片收窄。"
            }),
        /** 声墙长度：7.2 + 身高偏移[−0.5,1.8] + 等级(≥30)偏移[0,1.2]；聚声 ×1.25 / 散声 ×0.85；夹 5..11。 */
        reach: formula(
            F.base(7.2)
                .plus(F.body("height").minus(1.4).times(0.9).clamp(-0.5, 1.8))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1.2))
                .times(F.when(F.pref("focused"), F.const(1.25), F.const(0.85)))
                .clamp(5, 11).round(2),
            "声墙长度", {
                unit: "格",
                description: "声墙从身上推出去多远；身形越高、等级越高吼得越远，聚声把声音送得更远。它也是本招的实际射程与指示扇半径。"
            }),
        /** 向外推：0.55 + 特攻偏移[−0.12,0.5]；聚声 ×1.15 / 散声 ×0.8；夹 0.3..1.4。 */
        push: formula(
            F.base(0.55).plus(F.stat("specialAttack").minus(70).times(0.004).clamp(-0.12, 0.5))
                .times(F.when(F.pref("focused"), F.const(1.15), F.const(0.8))).clamp(0.3, 1.4).round(2),
            "向外推", {
                unit: "格",
                description: "被声墙轰中的人沿声墙前进方向被直直推开的距离；特攻越强推得越狠，聚声更集中。"
            }),
        /** 起手：12 刻 − 速度偏移[−3,5] + 聚声 2 刻；夹 7..17。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.04).clamp(-3, 5))
                .plus(F.when(F.pref("focused"), F.const(2), F.const(0))).clamp(7, 17).round(0),
            "起手", "扎住脚、吸满一口气再吼出去的时间；速度快的个体起得更快，聚声要多花一点把声音收成一条。"),
        /** 收招：12 刻 + 身高偏移[−2,4]；夹 8..18。 */
        settle: seconds(
            F.base(12).plus(F.body("height").minus(1.4).times(1.5).clamp(-2, 4)).clamp(8, 18).round(0),
            "收招", "吼完之后喘匀这口气的时间；身板越大的个体收得越慢。"),
        /** 冷却：30 刻 − 速度偏移[−6,8] + 聚声 4 / 散声 −2；夹 20..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.12).clamp(-6, 8))
                .plus(F.when(F.pref("focused"), F.const(4), F.const(-2))).clamp(20, 44).round(0),
            "冷却", "两次巨声之间的等待；速度快的个体回得更快，聚声更费嗓子。"),
        maxTargets: hidden(8)
    });

    defineDamage("hypervoice", "blast", {});

    stages("hypervoice", [
        { level: 50, values: { blast: 120, reach: 8.4, push: 0.7 } }
    ]);

    describe("hypervoice", [
        { key: "description.0", values: ["blast", "falloff"] },
        { key: "description.limit", values: ["maxTargets"] },
        { key: "description.1", values: ["arc", "reach"] },
        { key: "description.2", values: ["push"] },
        { key: "focused.on", values: [], when: function (context) { return read(context.detail.values, ["focused"]) === true; } },
        { key: "focused.off", values: [], when: function (context) { return read(context.detail.values, ["focused"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.reach", "tier.0.push"] }
    ]);
}
