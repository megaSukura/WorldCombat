/**
 * 击掌奇袭 / fakeout —— 参数、伤害段与「刚出场」的读取。
 *
 * 原生事实：一般／物理／威力 40／命中 100／PP 10／优先度 +3／接触；
 *   「进行先制攻击，使对手畏缩。要在出场后立刻使出才能成功」——100% 畏缩，且只在每次上场的第一回合成立（Cobblemon 1.8，86 位学习者）。
 *
 * 翻译：即时战斗里没有回合，本招把「出场后立刻」翻成一条**可读的未出手记录**：任何战斗者提交过一次招式，
 *   就记下那一刻；施法者若在这段时间内什么都没出过手，就还算「刚出场」。此时它可以闪身上去一记掌掴，
 *   优先度最高、几乎瞬发、必定打实，把目标拍懵一段（挂共享身份 world_combat:status/flinch 并投递打断）。
 *   一旦出过任何一手，这一记就失效，PP 不扣（ready 在提交前拒绝）。脱战 encounterIdle 之后重新上场，记录作废，
 *   又能再拍一次——这就是「每次进场一次」。
 *
 * 数据分散（每项依赖不同精灵数据）：
 *   swat        掌掴威力 = 30 + 物攻偏移 + 速度偏移；佯攻式 ×0.85 / 硬拍式 ×1.12；夹 22..96。
 *   blink       闪身距离 = 2.4 + 速度偏移 + 等级偏移；夹 2.2..4.6；也是射程来源。
 *   speed       每刻位移随速度；快到读不出中间过程。
 *   collisionRadius 判定半径随身高。
 *   push        顶开距离随物攻。
 *   dazeTicks   拍懵持续随等级；佯攻式更长、硬拍式更短。
 *   tempo／settle／recharge 速度决定起手、收招、冷却；佯攻式起手更快、冷却略久。
 *
 * 配置 `feint`（佯攻式）双向取舍：开启＝拍得更轻（×0.85）、但懵得更久（持续 ×1.35）且起手快 1 刻；
 *   关闭＝硬拍式：拍得更重（×1.12）、懵得短（×0.9）。一个换打断时长，一个换一下的伤害，各有局面。
 *
 * 伤害段 `swat` 与参数同名，走共享换算；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    export const fakeoutId = "fakeout";
    export const fakeoutScene = "world_combat:move_fakeout";
    export const fakeoutDazeEffect = "world_combat:fakeout_daze";

    /** 每个战斗者最近一次提交招式的时间；用「这段时间内没出过手」表达「刚出场」。 */
    var fakeoutLastAction: { [ref: string]: number } = Object.create(null);

    /** 刚出场：还没在这段时间内提交过任何招式。窗口取共享的交战空闲时长。 */
    export function fakeoutFresh(world: CombatWorld, actor: CombatActor): boolean {
        if (!world || !world.valid(actor)) return false;
        var last = fakeoutLastAction[String(actor.ref())];
        return last === undefined || world.tick() - last > NativeSemantics.encounterIdle;
    }

    actionParameters.define(fakeoutId, {
        /** 掌掴威力：30 +（物攻 − 60）× 0.22 [−10,18] +（速度 − 55）× 0.12 [−5,14]；佯攻 ×0.85 / 硬拍 ×1.12；夹 22..96。 */
        swat: formula(
            F.base(30)
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-10, 18))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-5, 14))
                .times(F.when(F.pref("feint", text("worldcombat.skill.fakeout.preference.feint")), F.const(0.85), F.const(1.12)))
                .clamp(22, 96).round(1),
            "掌掴威力", {
                unit: "威力",
                description: "这一记掌掴的威力；物攻给份量、速度给抢手。佯攻式拍得轻，换来更长的懵。对手防御、相性与暴击在命中时另算。"
            }),
        /** 闪身距离：2.4 +（速度 − 55）× 0.02 [−0.4,1.2] +（等级 − 30）× 0.03 [0,1.0]；夹 2.2..4.6。 */
        blink: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.4, 1.2))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1.0)).clamp(2.2, 4.6).round(2),
            "闪身距离", {
                unit: "格",
                description: "从起身到贴到对手面前的最大距离，也是本招的实际射程来源；腿快的个体从更远处就能抢到。"
            }),
        /** 每刻位移：1.3 +（速度 − 55）× 0.006 [−0.2,0.5]；夹 0.9..2.0。 */
        speed: formula(
            F.base(1.3).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.2, 0.5)).clamp(0.9, 2.0).round(2),
            "闪身速度", { unit: "格/刻", description: "闪过去每刻移动的距离；快到看不出中间过程，这就是「先制」。"
            }),
        /** 判定半径：0.4 +（身高 − 1.4）× 0.1 [−0.08,0.26]；夹 0.34..0.7。 */
        collisionRadius: formula(
            F.base(0.4).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.08, 0.26)).clamp(0.34, 0.7).round(2),
            "判定半径", { unit: "格", description: "掌风能拍到多大一圈；身板大的个体出手略宽，不容易被侧身让开。" }),
        /** 顶开距离：0.25 +（物攻 − 60）× 0.003 [−0.06,0.22]；夹 0.12..0.5。 */
        push: formula(
            F.base(0.25).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.06, 0.22)).clamp(0.12, 0.5).round(2),
            "顶开距离", { unit: "格", description: "拍实后把人推开一点的距离；主要以拍懵为主，推得不多。" }),
        /** 拍懵持续：18 +（等级 − 30）× 0.5 [0,24]；佯攻 ×1.35 / 硬拍 ×0.9；夹 12..60 刻。 */
        dazeTicks: seconds(
            F.base(18).plus(F.level().minus(30).times(0.5).clamp(0, 24))
                .times(F.when(F.pref("feint", text("worldcombat.skill.fakeout.preference.feint")), F.const(1.35), F.const(0.9)))
                .clamp(12, 60).round(0),
            "拍懵持续", "被拍懵的人这段时间内无法开始新动作，正在执行的那一手也会被打断；等级越高按得越久，佯攻式更久。"),
        /** 起手：2 −（速度 − 55）× 0.01 [−0.3,0.6] − 佯攻 1；夹 1..4 刻。 */
        tempo: seconds(
            F.base(2).minus(F.stat("speed").minus(55).times(0.01).clamp(-0.3, 0.6))
                .minus(F.when(F.pref("feint", text("worldcombat.skill.fakeout.preference.feint")), F.const(1), F.const(0)))
                .clamp(1, 4).round(0),
            "起手", "从起念到掌掴贴上之间的时间；几乎瞬发，这就是「先制」。"),
        /** 收招：6 −（速度 − 55）× 0.03 [−1,2]；夹 4..10 刻。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "掌收回身位的时间；快的人更快拉开，免得挨反手。"),
        /** 冷却：34 −（速度 − 55）× 0.08 [−3,5] + 佯攻 4；夹 22..50 刻。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.08).clamp(-3, 5))
                .plus(F.when(F.pref("feint", text("worldcombat.skill.fakeout.preference.feint")), F.const(4), F.const(0)))
                .clamp(22, 50).round(0),
            "冷却", "这一记之后多久能再抢一次；本招真正的一次性来自「刚出场」，冷却只是别让人连着拍。"),
        traceAhead: hidden(1.1),
        minimumMove: hidden(0.05)
    });

    defineDamage(fakeoutId, "swat", { defenceCoefficient: 0.005,
        rationale: "轻快的掌掴；击掌奇袭以抢手与打断为主，份量轻。" }, { contact: true });

    stages(fakeoutId, [
        { level: 25, values: { swat: 34 } },
        { level: 45, values: { swat: 48, dazeTicks: 34 } }
    ]);

    describe(fakeoutId, [
        { key: "description.0", values: ["swat"] },
        { key: "description.1", values: ["blink","speed","collisionRadius","push"] },
        { key: "description.2", values: ["dazeTicks"] },
        { key: "feint.on", values: [], when: function (context) { return read(context.detail.values, ["feint"]) === true; } },
        { key: "feint.off", values: [], when: function (context) { return read(context.detail.values, ["feint"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "settle", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.swat"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.swat", "tier.1.dazeTicks"] }
    ]);

    // 记账：任何战斗者提交一次招式就记下这一刻；击掌奇袭读取它判断施法者是不是「刚出场」。
    WorldCombat.on("world_combat:fakeout/opening", "world_combat:committed", "", function (event) {
        var actor = event.actor();
        if (actor === null) return;
        fakeoutLastAction[String(actor.ref())] = event.world().tick();
        var refs = Object.keys(fakeoutLastAction);
        if (refs.length > 256) {
            var now = event.world().tick();
            for (var i = 0; i < refs.length; i++) if (now - fakeoutLastAction[refs[i]] > NativeSemantics.encounterIdle * 2) delete fakeoutLastAction[refs[i]];
        }
    });
}
