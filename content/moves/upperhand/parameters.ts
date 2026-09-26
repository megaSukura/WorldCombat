/**
 * 快手还击 / upperhand —— 参数、数值来源与「对手正在出先制招 / 正在贴身抢攻」的读取。
 *
 * 原生事实：Fighting／物理／威力 65／命中 100／PP 15／优先度 +3／接触；
 * 「察觉到对手的动作后用掌根攻击，让对手畏缩。如果对手使出的招式不是先制攻击，则会失败」（Cobblemon 1.8）。
 *
 * 翻译：即时战斗里没有回合先制，本招保留两条可读的抢攻入口：
 *   一、**读到先制招**：任何生物提交招式时（世界事件 `world_combat:committed`），只要该招式原生优先度 > 0 且不是变化招式，
 *       就记下这一刻与招式；快手还击在出手时读到目标最近 `window` 刻内有这样一笔记录，就主动踏进一记掌根打实并把它按停。
 *   二、**正面迎掌**：普通原生敌人（原版怪等）没有公开的先制意图，就手动放招架起 `parryWindow` 刻的正面迎掌；
 *       第一次从正面来的**近身接触攻击**（`world_combat:incoming` 的真实 contact 事实）到来时，削掉这一次伤害 `parryCut`、
 *       立刻还一掌，并按需展开横扫。窗口过期只合掌。
 * 它仍是本族唯一以「截住对手这一手」为目的的一招：突袭只抢一下伤害，快手还击要的是抢回节奏。
 *
 * 数据分散（每个参数各吃不同的精灵数据）：
 *   snap            掌根威力 = 52 + 物攻偏移 + 等级偏移；横扫 ×0.88；夹 36..135。
 *   window          先制读取窗口 = 0.9 + 速度偏移[−0.12,0.3] 秒；夹 0.6..1.8。
 *   reach           掌程 = 2.4 + 速度偏移 + 物攻偏移；夹 2.2..3.8；也是射程来源。
 *   speed           踏进每刻位移随速度。
 *   collisionRadius 判定半径随身高。
 *   push            击退随物攻。
 *   swipe／arc       横扫分支的扇面半径与张角随身高与速度。
 *   flinchTicks     按停时长随等级；横扫分支略短（有力分摊）。
 *   parryWindow     正面迎掌时长随速度；夹 6..12 刻（基准 8 刻）。
 *   parryArc        迎掌总张角随速度；夹 100..180 度。
 *   parryCut        迎掌减伤比例随防御；夹 0.24..0.36（基准 0.30）。
 *   tempo／settle／recharge 速度决定起手收招冷却；横扫更慢更费。
 *
 * 配置 `wide`（横扫式）在「一掌把人按停」和「一圈人各挨一下」之间取舍：开启扇面 `swipe`／`arc` 覆盖多个敌人、
 *   各按停较短，单发 ×0.88、收招 +3、冷却 +5；关闭＝点掌，单发更重、按停更久。横扫只在一次成功迎击之后展开。
 */
namespace PokemonSkills {
    export const upperhandId = "upperhand";
    export const upperhandScene = "world_combat:move_upperhand";
    export const upperhandFlinchEffect = "world_combat:upperhand_flinch";
    export const upperhandRule = "world_combat:move_upperhand";
    export const upperhandAlertText = "world_combat.move.upperhand.text.alert";
    export const upperhandHitText = "world_combat.move.upperhand.text.hit";
    export const upperhandWhiffText = "world_combat.move.upperhand.text.whiff";
    export const upperhandGuardText = "world_combat.move.upperhand.text.guard";

    /** 目标最近一次「正在出先制招」的记录。 */
    export interface UpperhandRead { tick: number; move: string; priority: number; }
    export var upperhandReads: { [ref: string]: UpperhandRead } = Object.create(null);

    /** 内容 id（world_combat:<move>）到原生招式 id；非本命名空间或非法串返回 ""。 */
    export function upperhandMoveId(content: string): string {
        var id = String(content);
        if (id.indexOf("world_combat:") === 0) id = id.substring("world_combat:".length);
        return /^[a-z0-9]{1,64}$/.test(id) ? id : "";
    }
    /** 原生优先度；读不到模板返回 0。 */
    export function upperhandPriority(moveId: string): number {
        try { return Number(CobblemonCombat.moveTemplate(moveId).priority()); }
        catch (error) { return 0; }
    }
    export function upperhandRemember(world: CombatWorld, actor: CombatActor, moveId: string, priority: number): void {
        upperhandReads[String(actor.ref())] = { tick: world.tick(), move: moveId, priority: priority };
    }
    /** 目标在窗口内是否刚提交过先制攻击招式。 */
    export function upperhandFresh(world: CombatWorld, ref: string, window: number): boolean {
        var record = upperhandReads[ref];
        return record !== undefined && world.tick() - record.tick <= Math.max(1, window);
    }
    /** 起手/出手时挑一个处在正面、且在窗口内提交过先制招的最近敌人；没有返回 null。 */
    export function upperhandMark(world: CombatWorld, actor: CombatActor, origin: CombatPoint, direction: CombatPoint, reach: number,
        halfArcDegrees: number, window: number): CombatActor | null {
        var radius = Math.max(0.5, reach), best = radius + 0.01, nearest: CombatActor | null = null;
        var forward = WorldCombat.point(direction.x(), 0, direction.z());
        var heading = forward.length() < 1e-6 ? null : forward.unit();
        var cosHalf = Math.cos(Math.max(0, Math.min(180, halfArcDegrees)) * Math.PI / 180);
        var found = world.query(origin, radius, false);
        for (var i = 0; i < found.length; i++) {
            var candidate = found[i];
            if (candidate === null || String(candidate.ref()) === String(actor.ref()) || world.friendly(candidate)) continue;
            if (!upperhandFresh(world, String(candidate.ref()), window)) continue;
            var body = world.observe(candidate);
            if (body === null) continue;
            var delta = body.position().minus(origin);
            if (heading !== null) {
                var flat = WorldCombat.point(delta.x(), 0, delta.z());
                if (flat.length() > 1e-6 && flat.unit().x() * heading.x() + flat.unit().z() * heading.z() < cosHalf) continue;
            }
            var gap = delta.length();
            if (gap <= best) { best = gap; nearest = candidate; }
        }
        return nearest;
    }

    actionParameters.define(upperhandId, {
        /** 掌根威力：52 +（物攻 − 60）× 0.3 [−14,36] +（等级 − 30）× 0.5 [−4,12]；横扫 ×0.88；夹 36..135。 */
        snap: formula(
            F.base(52)
                .plus(F.stat("attack").minus(60).times(0.3).clamp(-14, 36))
                .plus(F.level().minus(30).times(0.5).clamp(-4, 12))
                .times(F.when(F.pref("wide"), F.const(0.88), F.const(1)))
                .clamp(36, 135).round(1),
            "掌根威力", {
                unit: "威力",
                description: "掌根打实这一下的威力；物攻与等级越高越重，横扫式把力道摊到一圈人身上、单发略轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 读取窗口：36 刻 +（速度 − 55）× 0.1 [−4,10]；夹 20..64 刻（即 1.0..3.2 秒）。 */
        window: seconds(
            F.base(36).plus(F.stat("speed").minus(55).times(0.1).clamp(-4, 10)).clamp(20, 64).round(0),
            "读取窗口", "目标在这段时间内提交过先制招式，就还读得到它这一手；留出这段余量，好让正在收招的施法者反应过来。"),
        /** 掌程：2.4 +（速度 − 55）× 0.01 [−0.25,0.8] +（物攻 − 60）× 0.005 [−0.2,0.5]；夹 2.2..3.8。 */
        reach: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.01).clamp(-0.25, 0.8))
                .plus(F.stat("attack").minus(60).times(0.005).clamp(-0.2, 0.5)).clamp(2.2, 3.8).round(2),
            "掌程", { unit: "格", description: "迎上去用掌根够到的最大距离，也是本招的实际射程来源；快的个体抢得更远。" }),
        /** 踏进速度：1.0 +（速度 − 55）× 0.006 [−0.15,0.45]；夹 0.8..1.7。 */
        speed: formula(
            F.base(1.0).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.45)).clamp(0.8, 1.7).round(2),
            "踏进速度", { unit: "格/刻", description: "迎上去每刻移动的距离；抢在对手那一招打出来之前贴到。" }),
        /** 判定半径：0.4 +（身高 − 1.4）× 0.1 [−0.08,0.26]；夹 0.34..0.7。 */
        collisionRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.26)).clamp(0.34, 0.7).round(2),
            "判定半径", { unit: "格", description: "掌根能按到多大一圈；身板大的个体出手更宽。" }),
        /** 击退：0.25 +（物攻 − 60）× 0.004 [−0.06,0.3]；夹 0.15..0.6。 */
        push: formula(
            F.base(0.25).plus(F.stat("attack").minus(60).times(0.004).clamp(-0.06, 0.3)).clamp(0.15, 0.6).round(2),
            "击退", { unit: "格", description: "命中后把目标顶开一点的距离；主要在打断，推得不多。" }),
        /** 横扫半径：0.9 +（身高 − 1.4）× 0.2 [−0.1,0.4] + 横扫 0.3；夹 0.9..1.8。 */
        swipe: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.1, 0.4))
                .plus(F.when(F.pref("wide"), F.const(0.3), F.const(0))).clamp(0.9, 1.8).round(2),
            "横扫半径", { unit: "格", description: "横扫式掌风覆盖的半径；只有开启横扫时用得到，越大越容易一次扫到多个敌人。" }),
        /** 横扫张角：120 +（速度 − 55）× 0.5 [−20,50] 度；夹 110..200。 */
        arc: formula(
            F.base(120).plus(F.stat("speed").minus(55).times(0.5).clamp(-20, 50)).clamp(110, 200).round(0),
            "横扫张角", { unit: "度", description: "横扫扇面的总张角；速度快的个体拧腰更开，一圈扫得更广。" }),
        /** 按停时长：30 +（等级 − 30）× 0.8 [0,26] − 横扫 6；夹 20..70 刻。 */
        flinchTicks: seconds(
            F.base(30).plus(F.level().minus(30).times(0.8).clamp(0, 26))
                .minus(F.when(F.pref("wide"), F.const(6), F.const(0))).clamp(20, 70).round(0),
            "按停时长", "被掌根按停的敌人多久不能开始新动作；等级越高按得越久，横扫式因为分摊而略短。"),
        /** 正面迎掌时长：8 +（速度 − 55）× 0.05 [−2,4]；夹 6..12 刻。 */
        parryWindow: seconds(
            F.base(8).plus(F.stat("speed").minus(55).times(0.05).clamp(-2, 4)).clamp(6, 12).round(0),
            "迎掌时长", "没有先制记录时正面架掌的时间；手快的个体多守几刻。窗口一过就合掌，不会一直守下去。"),
        /** 迎掌总张角：130 +（速度 − 55）× 0.4 [−18,34] 度；夹 100..180。 */
        parryArc: formula(
            F.base(130).plus(F.stat("speed").minus(55).times(0.4).clamp(-18, 34)).clamp(100, 180).round(0),
            "迎掌张角", { unit: "度", description: "正面能罩住的总张角；越快的个体转身越快、守得越宽。仍只挡正面，背后打来不算。" }),
        /** 迎掌减伤：0.30 +（防御 − 60）× 0.0006 [−0.03,0.05]；夹 0.24..0.36。 */
        parryCut: percent(
            F.base(0.30).plus(F.stat("defense").minus(60).times(0.0006).clamp(-0.03, 0.05)).clamp(0.24, 0.36),
            "迎掌减伤", "正面接住的那一次近身接触伤害被削掉的比例（约三成）；体格厚实的个体架得更稳。只削这一次，不是无敌，远程与背后都不算。"),
        /** 起手：1 −（速度 − 55）× 0.005 [−0.15,0.3]；夹 1..3。 */
        tempo: seconds(
            F.base(1).minus(F.stat("speed").minus(55).times(0.005).clamp(-0.15, 0.3)).clamp(1, 3).round(0),
            "起手", "从察觉到掌根贴上之间的时间；几乎瞬发，这就是「快手」。"),
        /** 收招：7 + 横扫 3；夹 5..12。 */
        settle: seconds(
            F.base(7).plus(F.when(F.pref("wide"), F.const(3), F.const(0))).clamp(5, 12).round(0),
            "收招", "掌根收回的时间；横扫式扫得更开、收得更久。"),
        /** 冷却：26 −（速度 − 55）× 0.1 [−3,5] + 横扫 5；夹 18..40。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.1).clamp(-3, 5))
                .plus(F.when(F.pref("wide"), F.const(5), F.const(0))).clamp(18, 40).round(0),
            "冷却", "这一掌之后多久能再抢一次；速度快的个体回得快，横扫式更费。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    defineDamage(upperhandId, "snap", {}, { contact: true, punch: true });

    stages(upperhandId, [
        { level: 35, values: { snap: 78 } },
        { level: 50, values: { snap: 94, flinchTicks: 44 } }
    ]);

    describe(upperhandId, [
        { key: "description.0", values: ["snap","window"] },
        { key: "description.1", values: ["parryWindow", "parryArc", "parryCut"] },
        { key: "description.2", values: ["flinchTicks"] },
        { key: "description.3", values: ["reach", "speed", "collisionRadius", "push"] },
        { key: "wide.on", values: ["swipe","arc"], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.snap"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.snap", "tier.1.flinchTicks"] }
    ]);

    // 记账：任何生物提交一次优先度 > 0 的攻击招式，就记下这一刻；快手还击读取它判断对手正在出先制招。
    // 攻击招式可能是 enemy（锁定目标）或 aim（朝一个方向）；两者都算，变化招式与自身/友方目标不算。
    WorldCombat.on("world_combat:upperhand/read", "world_combat:committed", "", function (event: CombatWorldEvent) {
        var action = event.action();
        if (action === null) return;
        var kind = action.targetKind();
        if (kind !== "enemy" && kind !== "aim") return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.observe(actor) === null) return;
        var moveId = upperhandMoveId(String(action.content()));
        if (moveId === "") return;
        var priority = upperhandPriority(moveId);
        if (!(priority > 0)) return;
        if (upperhandStatus(moveId)) return;
        upperhandRemember(world, actor, moveId, priority);
    });
    /** 变化招式不算攻击招式；模板读不到时保守地当作攻击。 */
    function upperhandStatus(moveId: string): boolean {
        try { return String(CobblemonCombat.moveTemplate(moveId).category()) === "Status"; }
        catch (error) { return false; }
    }
}
