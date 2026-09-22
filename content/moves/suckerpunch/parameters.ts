/**
 * 突袭 / suckerpunch —— 参数、数值来源与「对手正在出手」的读取。
 *
 * 原生事实：Dark／物理／威力 70／命中 100／PP 5／优先度 +1／接触；
 * 「可以比对手先攻击。对手使出的招式如果不是攻击招式则会失败」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有回合先手，本招把「抢在对手的招式之前」翻成一记**几乎不占时间的黑暗贴身打断**：
 *   施放瞬间（prepare 极短）朝锁定目标闪身贴上去刺出一记；成功与否取决于出手那一刻目标是不是正“在出手”。
 *   「正在出手」按两条可观察事实读取：目标是活的且当前有攻击对象（`CombatActor.attacking` 非空，僵尸一类
 *   原版近战走这条），或者它在最近 `window` 刻内提交过一次攻击招式（世界事件 `world_combat:committed`
 *   记下出手，非变化的招式不算）。两条都不成立时这一记会落空——PP 照扣（与原作「招式失败」一致），
 *   所以 AI 只在读准时才提议，而玩家可以硬赌。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   sneak           刺击威力 = 58 + 物攻偏移 + 速度偏移；预判 ×1.15；夹 44..150。
 *   window          读取窗口 = 1.2 秒 − 速度偏移[−0.2,0.35] + 预判 0.6 秒；夹 0.7..2.2 秒。
 *   blink           闪身距离 = 2.6 格 + 速度偏移 + 等级偏移；夹 2.2..4.6；也是射程来源。
 *   speed           每刻位移随速度；夹 0.9..2.0，几乎是一条黑线。
 *   collisionRadius 判定半径随身高。
 *   push            击退随物攻。
 *   tempo／settle／recharge 速度决定起手收招冷却；预判让起手与冷却更长。
 *
 * 配置 `read`（读招）：开启后读取窗口更长、刺击更重，代价是反应慢 2 刻（tempo +2）、冷却 +6；
 *   关闭＝纯靠反应，几乎瞬发、冷却短，但只认眼前的出手。
 */
namespace PokemonSkills {
    export const suckerpunchId = "suckerpunch";
    export const suckerpunchScene = "world_combat:move_suckerpunch";
    export const suckerpunchReadText = "world_combat.move.suckerpunch.text.read";
    export const suckerpunchHitText = "world_combat.move.suckerpunch.text.hit";
    export const suckerpunchWhiffText = "world_combat.move.suckerpunch.text.whiff";

    /** 目标最近一次可读到的攻击出手。 */
    export interface SuckerpunchRead { tick: number; move: string; }
    export var suckerpunchReads: { [ref: string]: SuckerpunchRead } = Object.create(null);

    /** 内容 id（world_combat:<move>）到原生招式 id；非本命名空间或非法串返回 ""。 */
    export function suckerpunchMoveId(content: string): string {
        var id = String(content);
        if (id.indexOf("world_combat:") === 0) id = id.substring("world_combat:".length);
        return /^[a-z0-9]{1,64}$/.test(id) ? id : "";
    }
    /** 原生模板能读到且为变化招式时，不算「攻击招式」。读不到模板时保守地当作攻击。 */
    export function suckerpunchStatus(moveId: string): boolean {
        try { return String(CobblemonCombat.moveTemplate(moveId).category()) === "Status"; }
        catch (error) { return false; }
    }
    export function suckerpunchRemember(world: CombatWorld, actor: CombatActor, moveId: string): void {
        suckerpunchReads[String(actor.ref())] = { tick: world.tick(), move: moveId };
    }
    /** 出手那一刻目标是否正「在出手」；window 是本招参数。 */
    export function suckerpunchArmed(world: CombatWorld, target: CombatActor | null, window: number): boolean {
        if (target === null || !world.valid(target) || world.friendly(target)) return false;
        var body = world.observe(target);
        if (body !== null && body.attacking() !== null) return true;
        var record = suckerpunchReads[String(target.ref())];
        return record !== undefined && world.tick() - record.tick <= Math.max(1, window);
    }

    actionParameters.define(suckerpunchId, {
        /** 刺击威力：58 +（物攻 − 60）× 0.32 [−16,40] +（速度 − 55）× 0.12 [−6,18]；预判 ×1.15；夹 44..150。 */
        sneak: formula(
            F.base(58)
                .plus(F.stat("attack").minus(60).times(0.32).clamp(-16, 40))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-6, 18))
                .times(F.when(F.pref("read"), F.const(1.15), F.const(1)))
                .clamp(44, 150).round(1),
            "刺击威力", {
                unit: "威力",
                description: "闪身刺出的这一下威力；物攻给狠度、速度给抢手。读招式再重一成。对手防御、相性与暴击在命中时另算。"
            }),
        /** 读取窗口：24 刻 −（速度 − 55）× 0.08 [−4,7] + 预判 12 刻；夹 14..44 刻（即 0.7..2.2 秒）。 */
        window: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.08).clamp(-4, 7))
                .plus(F.when(F.pref("read"), F.const(12), F.const(0))).clamp(14, 44).round(0),
            "读取窗口", "目标在这段时间内提交过攻击招式，就还算「在出手」；手快的个体只认眼前这一下，读招式把窗口拉长。"),
        /** 闪身距离：2.6 +（速度 − 55）× 0.02 [−0.4,1.2] +（等级 − 30）× 0.03 [0,1.0]；夹 2.2..4.6。 */
        blink: formula(
            F.base(2.6).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.4, 1.2))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1.0)).clamp(2.2, 4.6).round(2),
            "闪身距离", { unit: "格", description: "贴上去刺出的最大距离，也是本招的实际射程来源；腿快的个体从更远处就能抢先。" }),
        /** 每刻位移：1.2 +（速度 − 55）× 0.006 [−0.2,0.5]；夹 0.9..2.0。 */
        speed: formula(
            F.base(1.2).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.5)).clamp(0.9, 2.0).round(2),
            "闪身速度", { unit: "格/刻", description: "闪过去每刻移动的距离；快到几乎看不出中间过程，这就是「抢在对手前面」。" }),
        /** 判定半径：0.38 +（身高 − 1.4）× 0.1 [−0.08,0.26]；夹 0.32..0.66。 */
        collisionRadius: formula(
            F.base(0.38).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.26)).clamp(0.32, 0.66).round(2),
            "判定半径", { unit: "格", description: "刺击能咬住多大一圈；身板大的个体出手略宽。" }),
        /** 击退：0.2 +（物攻 − 60）× 0.003 [−0.05,0.25]；夹 0.1..0.5。 */
        push: formula(
            F.base(0.2).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.05, 0.25)).clamp(0.1, 0.5).round(2),
            "击退", { unit: "格", description: "命中后把目标顶开一点的距离；突袭以快为主，推得不多。" }),
        /** 起手：1 + 预判 2 +（速度 − 55）× −0.01 [−0.3,0.6]；夹 1..5。 */
        tempo: seconds(
            F.base(1).plus(F.when(F.pref("read"), F.const(2), F.const(0)))
                .minus(F.stat("speed").minus(55).times(0.01).clamp(-0.3, 0.6)).clamp(1, 5).round(0),
            "起手", "从起念到刺出之间的时间；几乎瞬发，读招式会先读一拍再动手。"),
        /** 收招：6 −（速度 − 55）× 0.03 [−1,2]；夹 4..10。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "刺完收回身位的时间；快的人更快拉开。"),
        /** 冷却：30 −（速度 − 55）× 0.1 [−3,5] + 预判 6；夹 20..46。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.when(F.pref("read"), F.const(6), F.const(0))).clamp(20, 46).round(0),
            "冷却", "这一刺之后多久能再抢一次；速度快的个体回得快，读招式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(suckerpunchId, "sneak", {}, { contact: true });

    stages(suckerpunchId, [
        { level: 35, values: { sneak: 84 } },
        { level: 50, values: { sneak: 100, blink: 3.4 } }
    ]);

    describe(suckerpunchId, [
        { key: "description.0", values: ["sneak", "window"] },
        { key: "description.1", values: ["blink", "speed", "collisionRadius", "push"] },
        { key: "read.on", values: [], when: function (context) { return read(context.detail.values, ["read"]) === true; } },
        { key: "read.off", values: [], when: function (context) { return read(context.detail.values, ["read"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.sneak"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.sneak", "tier.1.blink"] }
    ]);

    // 记账：任何生物提交一次攻击招式（非变化）就记下这一刻；突袭读取它判断对手「正在出手」。
    WorldCombat.on("world_combat:suckerpunch/read", "world_combat:committed", "", function (event: CombatWorldEvent) {
        var action = event.action();
        if (action === null || action.targetKind() !== "enemy") return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.observe(actor) === null) return;
        var moveId = suckerpunchMoveId(String(action.content()));
        if (moveId === "" || suckerpunchStatus(moveId)) return;
        suckerpunchRemember(world, actor, moveId);
    });
}
