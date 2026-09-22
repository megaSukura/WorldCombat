/**
 * 仿效 / copycat —— 参数与机制数值来源。
 *
 * 核心念头：整座场地上刚刚响过的那一手，被施法者原样再演一遍。它不针对某个人，只捡“最后响起的声音”；
 *   若场上还没人出过手，这一手无声落下。
 *
 * 原生事实（Showdown copycat）：Normal／变化／命中 —／PP 20／target self；`onHit` 取 `this.lastMove`
 *   （全场最后使用的招式），若不存在或带 `failcopycat` 就失败，否则 `useMove(move.id, pokemon)` 原样使出。
 * 世界化：由 world_combat:committed 维护一条全局“最近一次出手”账本（只记已实装的招式动作），
 *   本招在 windup（提交前）把账本快照进 action.data——这样自己提交成 copycat 也不会把要捡的那一手冲掉；
 *   execute 检查窗口、是否已实装、是否带 failcopycat，然后经 NativeLoadout.call 沿用同一笔提交把它使出。
 *
 * 每个参数读不同的精灵数据（分散到不同参数）：
 *   span      借来的招式最多能到多远；速度与等级共同决定，也是本招的实际射程来源。
 *   window    回声记忆窗口：能捡多久以前的那次出手；特攻记得更久，细学更久。
 *   echoes    回荡涟漪的数量；特攻决定表现里的圈数。
 *   tempo     起手：速度越快张口越快；细学要多等一拍。
 *   aftercast 收势：速度越快越快收住。
 *   recharge  冷却：速度越快越熟练；细学更贵。
 * 配置 deep（深回声）双向取舍：记忆窗口更长、回声更亮，但起手更慢、冷却更长；关闭则是短促的抢回声。
 *   它通过 F.pref("deep") 进入公式。
 */
namespace PokemonSkills {
    export const copycatId = "copycat";
    export const copycatScene = "world_combat:move_copycat";
    export const copycatCopyText = "world_combat.move.copycat.text.copy";
    export const copycatEmptyText = "world_combat.move.copycat.text.empty";

    /** 全局回声账本：最近一次真正提交的、已实装招式动作。 */
    export interface CopycatEcho { id: string; tick: number; ref: string; }
    export var copycatLedger: CopycatEcho | null = null;

    actionParameters.define(copycatId, {
        span: formula(
            F.base(8).plus(F.stat("speed").times(0.06)).plus(F.level().times(0.1)).clamp(6, 20).round(1),
            "回荡距离", {
                unit: "格",
                description: "借来的招式最多能送到多远；腿快的个体能替远处的招式回响。它也是本招的实际射程来源。"
            }),
        window: seconds(
            F.base(120).plus(F.stat("specialAttack").times(0.8)).plus(F.level().times(0.6))
                .times(F.when(F.pref("deep"), F.const(1.6), F.const(1)))
                .clamp(80, 300).round(0),
            "回声窗口", "能捡多久以前的那次出手；特攻越高、细学时记得越久，太久以前的出手不再被模仿。"),
        echoes: formula(
            F.base(6).plus(F.stat("specialAttack").div(8)).clamp(6, 18).round(0),
            "回荡圈数", {
                unit: "圈",
                description: "从脚下荡开的回声涟漪圈数；特攻越高越密，也驱动画面的层次。"
            }),
        tempo: seconds(
            F.base(6).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("deep"), F.const(3), F.const(0)))
                .clamp(2, 12).round(0),
            "起手", "从张口到把那一手重新亮起的时间；速度越快越短，细学要多等一拍。"),
        aftercast: seconds(
            F.base(4).minus(F.stat("speed").times(0.005)).clamp(2, 7).round(0),
            "收势", "演完之后的收势；速度越快越短。"),
        recharge: seconds(
            F.base(60).minus(F.stat("speed").times(0.08))
                .times(F.when(F.pref("deep"), F.const(1.35), F.const(1)))
                .clamp(30, 100).round(0),
            "冷却", "两次仿效之间的等待；速度快的个体更快，细学更贵。")
    });

    describe(copycatId, [
        { key: "description.0", values: ["span", "window"] },
        { key: "description.1", values: ["echoes"] },
        { key: "description.2", values: ["tempo", "aftercast", "recharge"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);

    // 记账：任何生物提交一次已实装的招式动作就记下这一刻；仿效读取它捡起“最后响起的那一手”。
    WorldCombat.on("world_combat:move_copycat/ledger", "world_combat:committed", "", function (event) {
        const action = event.action();
        if (action === null) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const executing = NativeLoadout.executing(action);
        if (executing === null) return;
        copycatLedger = { id: String(executing.id()), tick: world.tick(), ref: String(actor.ref()) };
    });
}
