/**
 * 火箭头锤 / Skull Bash — 参数与数值来源。
 *
 * 原生：Normal／Physical／威力 130／命中 100／PP 10／charge（第一回合缩头提防御，第二回合攻击）／contact。
 * 世界化：念头是“缩头护住要害，再把护住的头当撞锤甩出去”。提交后先蹲桩蓄力：期间被 rooted、
 * 提升护甲与原生防御，并用共用的 GuardEffects 架住伤害；然后沿直线重撞。
 * 撞上第一个敌人时读它背后：若背后被墙/方块堵住（world.clear 不通），这一下把它钉在墙上，
 * 追加 slamBonus 并把它的节奏撞乱（rooted）；同时把目标背后的方块凿成一个临时缺口（world.terrain
 * 的 linger 租约，换成空气、breachTicks 后原地形自己放回）——撞锤把墙本身也当成目标，
 * 战场短时间里多出一条通路，时间一到墙就长回来，不留永久改动。
 *
 * 数值来源（每个参数取不同的精灵数据，公式即悬浮说明里展开的那一棵）：
 *   power           = 基础 58 + 体重 / 40（夹在 0..+24，体重单位 0.1kg；越重撞得越沉）。
 *   charge          = 基础 24 刻 − (速度 − 45) × 0.08（夹在 0..18），夹在 6..24 刻；速度快的缩头更快。
 *   armorGain       = 基础 2 + 防御 × 0.03，夹在 2..8 点护甲。
 *   braceBlock      = 固定 40%：缩头期间架住的伤害比例。
 *   guardStage      = 固定 1 级防御提升（深蓄再 +1）。
 *   distance        = (基础 3 + 体重 × 0.0002) × 深度倍率（深蓄 1.15／速收 0.9）。
 *   speed           = 基础 0.62 + 速度 × 0.001 格/刻。
 *   collisionRadius = 基础 0.42 + (碰撞箱高度 − 1.4) × 0.35 格。
 *   push            = 基础 0.35 + 体重 × 0.0003（夹在 0..0.8）格。
 *   slamBonus/slamStun = 撞墙追加的威力倍率与把目标撞乱的刻数。
 *   slamBlocks      = 撞墙时最多把背后几格凿成缺口。
 *   breachTicks     = 凿出的缺口在多少刻后自行合拢、原地形放回。
 * 配置项 deep 在“速收”（更短蓄力、护甲略低、更弱更短）和“深蓄”（更长蓄力、护甲与减伤更强）之间取舍。
 */
namespace PokemonSkills {
    /** 配置项的值：深蓄（true）与速收（false）。 */
    export function skullBashDeep(config: any): boolean { return !!config.deep; }
    /** 深蓄（true）与速收（false）在这个参数上的倍率，配置分支在悬浮里展开。 */
    function skullBashDepth(deep: number, quick: number): Formula.Node {
        return F.when(F.pref("deep"), F.const(deep), F.const(quick));
    }

    actionParameters.define("skullbash", {
        /** 撞锤威力：58 + 体重 / 40（体重单位 0.1kg），夹在 58..96。 */
        power: formula(
            F.base(58).plus(F.body("weight").div(40).clamp(0, 24)).clamp(58, 96).round(1),
            "撞锤威力", {
                unit: "威力",
                description: "这一撞的基础威力；体重越大撞得越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 蓄力时间：24 − (速度 − 45) × 0.08 刻，夹在 6..24。 */
        charge: formula(
            F.base(24).minus(F.stat("speed").minus(45).times(0.08).clamp(0, 18)).clamp(6, 24).round(0),
            "蓄力时间", {
                unit: "刻",
                description: "缩头站桩的刻数；期间不能移动，但护甲、防御与架势减伤提升。速度越快缩头越快。"
            }),
        /** 蓄力护甲：2 + 防御 × 0.03，夹在 2..8 点。 */
        armorGain: formula(
            F.base(2).plus(F.stat("defence").times(0.03)).clamp(2, 8).round(1),
            "蓄力护甲", {
                unit: "点护甲",
                description: "缩头期间获得的原版护甲点数；自身防御越高，蹲得越硬。"
            }),
        braceBlock: ratio(0.4, "架势减伤", "缩头期间架住的伤害比例；站桩不能动换来的正面减伤。"),
        guardStage: n(1, "防御提升", " 级"),
        /** 冲撞距离：(3 + 体重 × 0.0002) × 深度倍率，夹在 2.5..5.5 格。 */
        distance: formula(
            F.base(3).plus(F.body("weight").times(0.0002))
                .times(skullBashDepth(1.15, 0.9))
                .clamp(2.5, 5.5).round(2),
            "冲撞距离", {
                unit: "格",
                description: "蹲桩后沿直线冲出的长度；深蓄更长，速收更短。"
            }),
        /** 冲撞速度：0.62 + 速度 × 0.001 格/刻。 */
        speed: formula(
            F.base(0.62).plus(F.stat("speed").times(0.001)).clamp(0.45, 1.0).round(3),
            "冲撞速度", {
                unit: "格/刻",
                description: "冲撞每刻推进的距离；速度越快越难被侧移躲开。"
            }),
        /** 冲撞判定半径：0.42 + (碰撞箱高度 − 1.4) × 0.35 格。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.35)).clamp(0.35, 1.0).round(2),
            "冲撞判定半径", {
                unit: "格",
                description: "冲撞贴到目标身上的横向判定；身体越高大越大。"
            }),
        /** 命中推离：0.35 + 体重 × 0.0003 格（夹在 0..0.8）。 */
        push: formula(
            F.base(0.35).plus(F.body("weight").times(0.0003).clamp(0, 0.8)).clamp(0.3, 1.15).round(2),
            "命中推离距离", {
                unit: "格",
                description: "命中后把目标沿冲撞方向推开的距离；体重越大推得越远，也更常把它顶到墙上。"
            }),
        slamBonus: n(1.35, "撞墙加成", " 倍", "把目标顶到墙/方块上时追加的威力倍率。"),
        slamStun: ticks(20, "撞墙僵直", "撞墙时把目标撞乱、定住的刻数。"),
        slamBlocks: n(4, "缺口格数", " 格", "撞墙时最多把目标背后这么多格凿成缺口；缺口是临时租借的，撞不动的方块（基岩、保护区域、带方块实体的方块）不会被改动。"),
        breachTicks: ticks(120, "缺口存续", "凿出的缺口在这么多秒后自行合拢、原地形放回；这段时间里别的生物与别的招都能走过去。"),
        slamReach: hidden(1.6),
        traceAhead: hidden(2),
        minimumMove: hidden(0.05)
    });

    defineDamage("skullbash", "power", {
        rationale: "长时间站桩换来的一记重撞：蓄力期间被 rooted、暴露位置，撞空还要再收招；命中的力量与推离随体重增长，把对手顶上墙会更重并撞乱它的节奏。"
    }, { contact: true });

    stages("skullbash", [
        { level: 32, values: { push: 0.5 } },
        { level: 50, values: { guardStage: 2 } },
        { level: 68, values: { cooldown: 60 } }
    ]);

    describe("skullbash", [
        { key: "description.0", values: ["power", "distance"] },
        { key: "description.1", values: ["charge", "armorGain", "braceBlock", "guardStage"] },
        { key: "description.2", values: ["speed", "collisionRadius", "push"] },
        { key: "description.3", values: ["slamBonus", "slamStun", "slamBlocks", "breachTicks"] },
        { key: "stance.quick", values: [], when: function (context) { return !read(context.detail.values, ["deep"]); } },
        { key: "stance.deep", values: [], when: function (context) { return !!read(context.detail.values, ["deep"]); } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.push"], when: function (context) { return context.pokemon.level() >= 32; } },
        { key: "growth.1", values: ["tier.1.level", "tier.1.guardStage"], when: function (context) { return context.pokemon.level() >= 50; } },
        { key: "growth.2", values: ["tier.2.level", "tier.2.cooldown"], when: function (context) { return context.pokemon.level() >= 68; } }
    ]);
}
