/**
 * 铁滚轮 / steelroller —— 参数、数值来源与「脚下场地」的读取。
 *
 * 原生事实：Steel／物理／威力 130／命中 100／PP 5／优先度 0／接触；
 * 「在破坏场地的同时攻击对手。如果脚下没有任何场地状态存在，使出此招式时便会失败」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里场地是一片真的区域规则（`WorldEffects.field`）。本招只有站在一片场地上才滚得起来：
 *   出手时读出脚下正在生效的场地（电气／青草／薄雾／精神，含特性掀起的同名场地），把它们逐条结束
 *   （场地被压碎），再卷成钢轮沿瞄准方向滚出去，撞上首个敌人结算 `roll` 并顶开；滚过之处在地面留下
 *   一道短命的钢辙（`world.terrain` 租借，到期原方块回来）。脚下没有场地时整招失败（PP 照扣，与原作一致）。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   roll            撞击威力 = 112 + 物攻偏移 + 防御偏移；碾磨 ×1.18；夹 88..215。
 *   distance        滚动距离 = 3.6 格 + 速度偏移 + 等级偏移；碾磨 ×0.8；夹 2.8..6.2；也是射程来源。
 *   speed           每刻位移随速度；碾磨略慢。
 *   collisionRadius 判定半径随身高。
 *   push            击退随物攻。
 *   scarCells       钢辙块数随物攻；碾磨 ×1.4。
 *   scarTicks       钢辙停留随等级。
 *   scraper         钢屑数量随物攻与等级；驱动表现。
 *   tempo／settle／recharge 速度与等级决定起手收招冷却；碾磨更慢更费。
 *
 * 配置 `grind`（碾磨式）：开启后碾得更重（威力 ×1.18、钢辙更长更多），代价是滚得近（距离 ×0.8、速度 ×0.9）、
 *   收招 +5 刻、冷却 +8 刻；关闭＝滚掠式，滚得远而快、收得干净，单发略轻。
 */
namespace PokemonSkills {
    export const steelrollerId = "steelroller";
    export const steelrollerScene = "world_combat:move_steelroller";
    export const steelrollerTearText = "world_combat.move.steelroller.text.tear";
    export const steelrollerHitText = "world_combat.move.steelroller.text.hit";
    export const steelrollerFalterText = "world_combat.move.steelroller.text.falter";

    /** 场地在活体身上的共享身份；AI 用它做便宜的判断。 */
    export var steelrollerTerrainNames: string[] = ["electricterrain", "grassyterrain", "mistyterrain", "psychicterrain"];

    /**
     * 脚下正在生效、覆盖该点的场地（已展开的，不含预约）。按共享的场地类别读取：任何声明了场地类别的
     * 生产者（四种场地招式与 surge 特性）都会被读到，不枚举规则 id，新场地自动可用。
     */
    export function steelrollerAreas(world: CombatWorld, point: CombatPoint): WorldEffects.Area[] {
        return WorldEffects.areasWithTag(world, WorldEffects.categories.terrain, point, 0);
    }
    /** 该点是否被某片场地覆盖且脚下贴地；机制判定与 AI 共用同一份判据。 */
    export function steelrollerCharged(world: CombatWorld, actor: CombatActor): boolean {
        if (!world.valid(actor)) return false;
        var body = world.observe(actor);
        if (body === null || !body.grounded()) return false;
        return steelrollerAreas(world, body.position()).length > 0;
    }

    actionParameters.define(steelrollerId, {
        /** 撞击威力：112 +（物攻 − 60）× 0.4 [−20,48] +（防御 − 60）× 0.15 [−6,20]；碾磨 ×1.18；夹 88..215。 */
        roll: formula(
            F.base(112)
                .plus(F.stat("attack").minus(60).times(0.4).clamp(-20, 48))
                .plus(F.stat("defence").minus(60).times(0.15).clamp(-6, 20))
                .times(F.when(F.pref("grind"), F.const(1.18), F.const(1)))
                .clamp(88, 215).round(1),
            "撞击威力", {
                unit: "威力",
                description: "钢轮碾过目标那一下的威力；物攻给重量、防御给滚轮的硬度，碾磨式再多一成八。对手防御、相性与暴击在命中时另算。"
            }),
        /** 滚动距离：3.6 +（速度 − 55）× 0.012 [−0.3,1.0] +（等级 − 40）× 0.03 [0,1.2]；碾磨 ×0.8；夹 2.8..6.2。 */
        distance: formula(
            F.base(3.6).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 1.0))
                .plus(F.level().minus(40).times(0.03).clamp(0, 1.2))
                .times(F.when(F.pref("grind"), F.const(0.8), F.const(1))).clamp(2.8, 6.2).round(2),
            "滚动距离", { unit: "格", description: "钢轮滚出去的最大距离，也是本招的实际射程来源；腿快的个体滚得更远，碾磨式滚得近。"
            }),
        /** 每刻位移：0.85 +（速度 − 55）× 0.004 [−0.1,0.35]；碾磨 ×0.9；夹 0.7..1.4。 */
        speed: formula(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.1, 0.35))
                .times(F.when(F.pref("grind"), F.const(0.9), F.const(1))).clamp(0.7, 1.4).round(2),
            "滚动速度", { unit: "格/刻", description: "钢轮每刻滚过的距离；碾磨式慢一点，但碾得更实。" }),
        /** 判定半径：0.5 +（身高 − 1.4）× 0.12 [−0.08,0.3]；夹 0.42..0.85。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.12).clamp(-0.08, 0.3)).clamp(0.42, 0.85).round(2),
            "判定半径", { unit: "格", description: "钢轮能撞到多大一圈；身板大的个体滚得更宽。" }),
        /** 击退：0.45 +（物攻 − 60）× 0.006 [−0.1,0.5]；夹 0.3..1.0。 */
        push: formula(
            F.base(0.45).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.1, 0.5)).clamp(0.3, 1.0).round(2),
            "击退", { unit: "格", description: "被钢轮撞中的人沿滚动方向被顶开的距离；力量越大顶得越远。" }),
        /** 钢辙块数：10 +（物攻 − 60）× 0.15 [−2,10]；碾磨 ×1.4；夹 6..28。 */
        scarCells: formula(
            F.base(10).plus(F.stat("attack").minus(60).times(0.15).clamp(-2, 10))
                .times(F.when(F.pref("grind"), F.const(1.4), F.const(1))).clamp(6, 28).round(0),
            "钢辙块数", { unit: "块", description: "滚过之后地面被压出的钢辙有多少块；物攻越高、碾磨式越长，也是画面里辙痕的密度。" }),
        /** 钢辙停留：90 +（等级 − 40）× 1.0 [0,30] 刻；夹 70..170。 */
        scarTicks: seconds(
            F.base(90).plus(F.level().minus(40).times(1.0).clamp(0, 30)).clamp(70, 170).round(0),
            "钢辙停留", "压出的钢辙过多久被地面收回；等级越高留得越久。"),
        /** 钢屑数量：18 +（物攻 − 60）× 0.2 [−4,24]；夹 12..48。 */
        scraper: formula(
            F.base(18).plus(F.stat("attack").minus(60).times(0.2).clamp(-4, 24)).clamp(12, 48).round(0),
            "钢屑数量", { unit: "点", description: "滚动与撞击时迸出的钢屑数量；物攻越高越密，粒子直接按它发射。" }),
        /** 起手：12 −（速度 − 55）× 0.05 [−1,4] 刻；夹 8..16。 */
        tempo: seconds(
            F.base(12).minus(F.stat("speed").minus(55).times(0.05).clamp(-1, 4)).clamp(8, 16).round(0),
            "起手", "从站定到卷成钢轮之间的时间；速度快的个体起得更早。"),
        /** 收招：12 + 碾磨 5；夹 9..20。 */
        settle: seconds(
            F.base(12).plus(F.when(F.pref("grind"), F.const(5), F.const(0))).clamp(9, 20).round(0),
            "收招", "滚完收住的时间；碾磨式滚得慢、也要收更久。"),
        /** 冷却：64 −（等级 − 40）× 0.3 [−3,6] + 碾磨 8；夹 52..86。 */
        recharge: seconds(
            F.base(64).minus(F.level().minus(40).times(0.3).clamp(-3, 6))
                .plus(F.when(F.pref("grind"), F.const(8), F.const(0))).clamp(52, 86).round(0),
            "冷却", "这一滚之后多久能再卷起来；等级高的个体回得更快，碾磨式更费。"),
        traceAhead: hidden(2.4),
        minimumMove: hidden(0.05)
    });

    defineDamage(steelrollerId, "roll", {}, { contact: true });

    stages(steelrollerId, [
        { level: 50, values: { roll: 150 } },
        { level: 62, values: { roll: 172, distance: 4.6 } }
    ]);

    describe(steelrollerId, [
        { key: "description.0", values: ["roll","distance"] },
        { key: "description.1", values: ["speed","collisionRadius","push","scarCells","scarTicks"] },
        { key: "grind.on", values: [], when: function (context) { return read(context.detail.values, ["grind"]) === true; } },
        { key: "grind.off", values: [], when: function (context) { return read(context.detail.values, ["grind"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.roll"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.roll", "tier.1.distance"] }
    ]);
}
