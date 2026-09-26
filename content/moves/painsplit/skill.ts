/**
 * 分担痛楚 / painsplit —— 注册与动作。
 *
 * 核心念头：用双方当前生命差做一次可见的平衡，但只有真抽出来的那一截才能补回去。
 *   先量（windup，提交前）：一条细红的痛线从施法者牵向目标，两端各浮起一团跳动的生命光，把「要把两团生命拉平」先说清楚。
 *   抽（execute，提交后）：先对生命较高的一方申请一次不致死的原生减量（`world.health` 负值走原生 hurt，第四参传最低生命），
 *     读回实际失血；再按这份实际失血给生命较低的一方原生治疗，最多补到本次平均值、且不超过其最大生命。
 *   所以只有真抽到血，后面才有回填：目标免疫/护盾/伤害上限挡下抽血时，谁都不会白得治疗，也不第二次补杀。
 *
 * 选取：`kind: "aim"`——接受任意阵营实体或世界点，允许空放；submit 前提交时不再强制存在敌人。
 *   明确选中友方时，按「自己生命更高就自损、把伙伴补起来」，但友方伤害仍走原生友伤权限（抽不动友方就是抽不动），
 *   自己给自己抽血始终允许，就是这招的自损事实。执行时会复查真实射程与视线，隔墙或追选中都不补算。
 *
 * 说明几件事：它只把两边生命拉向同一个数（平均值），不经过属性、相性与暴击；两边的最终数值取决于双方当前生命、取整与
 * 实际受/拒伤害，浮字显示的是原生入口回执的各自实际变化，没能拉平就不声称两边已经平均。
 */
namespace PokemonSkills {
    const painsplitScene = "world_combat:move_painsplit";
    const painsplitGainText = "world_combat.move.painsplit.text.gain";
    const painsplitLossText = "world_combat.move.painsplit.text.loss";
    const painsplitFlatText = "world_combat.move.painsplit.text.flat";
    const painsplitBlockedText = "world_combat.move.painsplit.text.blocked";
    const painsplitMissText = "world_combat.move.painsplit.text.miss";

    function painsplitRound(value: number): number { return Math.round(value * 10) / 10; }

    /**
     * 一次双向平衡：先对较高生命一方申请不致死的原生减量，读回实际失血，再给较低一方至多这份实际失血、
     * 且不超过本次平均值与其最大生命的治疗。返回双方实际变化与用于表现的机制量；不会直接改生命，也不第二次补杀。
     */
    export function painsplitApply(world: CombatWorld, actor: CombatActor, target: CombatActor, minimumHealth: number): any {
        var self = world.observe(actor), foe = world.observe(target);
        if (self === null || foe === null) return null;
        var myHp = self.health(), theirHp = foe.health();
        var reference = Math.max(1, Math.max(self.maxHealth(), foe.maxHealth()));
        var gap = Math.abs(myHp - theirHp);
        var average = Math.max(1, Math.floor((myHp + theirHp) / 2));
        var selfChange = 0, targetChange = 0, loss = 0, heal = 0, requested = 0, refused = false, payerSelf = myHp >= theirHp;
        if (gap >= 0.01) {
            payerSelf = myHp > theirHp;
            var payer = payerSelf ? actor : target;
            var receiver = payerSelf ? target : actor;
            var receiverHp = payerSelf ? theirHp : myHp;
            var receiverMax = payerSelf ? foe.maxHealth() : self.maxHealth();
            requested = (payerSelf ? myHp : theirHp) - average;
            // 原生减量：负值走原生 hurt，第四参的最低生命把这一抽夹在非致死；读回实际失血而不是理论值。
            var paid = world.health(payer, -requested, "world_combat:painsplit", minimumHealth);
            loss = paid < 0 ? -paid : 0;
            // 只有这份实际失血才能变成治疗；补到本次平均值即止，也不超过受治疗者的最大生命。
            var gain = Math.min(loss, average - receiverHp, receiverMax - receiverHp);
            if (gain > 0.001) {
                var healed = world.health(receiver, gain, "world_combat:painsplit");
                heal = healed > 0 ? healed : 0;
            }
            refused = loss <= 0.001;
            if (payerSelf) { selfChange = -loss; targetChange = heal; }
            else { selfChange = heal; targetChange = -loss; }
        }
        return { average: average, gap: gap, reference: reference, requested: requested,
            loss: loss, heal: heal, selfChange: selfChange, targetChange: targetChange,
            payerSelf: payerSelf, refused: refused, flat: gap < 0.01,
            myHp: myHp, theirHp: theirHp,
            selfRatio: self.maxHealth() > 0 ? myHp / self.maxHealth() : 1,
            targetRatio: foe.maxHealth() > 0 ? theirHp / foe.maxHealth() : 1 };
    }

    define({
        id: "painsplit",
        name: "分担痛楚",
        description: "牵起一条痛线，先把生命较高一方的血抽出一截（不会致死），再把实际抽到的部分补给生命较低的一方；抽不到就补不了，谁都可能成为付出的一方。",
        uses: ["在自己生命远低于对手时把差距拉平", "抽走一个高血量目标的一截生命来补自己", "选中受伤的伙伴，用自己实际付出的生命换回他的生命"],
        kind: "aim",
        range: 5,
        maxRange: 8.5,
        prepare: 7,
        active: 0,
        recover: 7,
        cooldown: 24,
        style: "link",
        stationary: true,
        defaults: { helpFriends: true, ai: { maxChase: 10, margin: 0.1, leaveStation: false, rescue: false } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["painsplit"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("painsplit", "link", context)), recover: Math.round(p("painsplit", "recover", context)),
                cooldown: Math.round(p("painsplit", "cooldown", context)), active: 0, range: p("painsplit", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            var world = action.sense(), actor = action.actor(), target = action.target();
            // 自由瞄准：点世界点或空放时 target 为 null，交给 execute 走空放；这里只对真实实体复查射程与视线。
            if (target === null || target === undefined) return "";
            if (String(target.ref()) === String(actor.ref())) return "invalid-target";
            if (!world.valid(target)) return "";
            var body = world.observe(target), self = world.observe(actor);
            if (body === null || self === null) return "invalid-target";
            if (self.position().minus(body.position()).length() > p("painsplit", "reach", action)) return "out-of-range";
            if (!world.clear(self.position(), body.position())) return "target-not-visible";
            return "";
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var target = action.target();
            if (target === null || target === undefined) return prepare;
            action.present("world_combat:painsplit:" + action.id(), painsplitScene, 1, action.origin(), JSON.stringify({
                moment: "reach", target: String(target.ref()), path: ["source", "target"],
                scale: scale, motes: Math.round(p("painsplit", "motes", action)) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            var world = action.world(), actor = action.actor(), target = action.target();
            var self = world.observe(actor);
            if (self === null) { done(action); return; }
            var scale = (self.width() + self.height()) / 2.3;
            var motes = Math.round(p("painsplit", "motes", action));
            var floor = Math.round(p("painsplit", "floor", action));
            // 空放／目标已离场：只播空放，不假结算。
            if (target === null || target === undefined || !world.valid(target) || String(target.ref()) === String(actor.ref())) {
                WorldFeedback.emit(world, painsplitScene, 1, self.position(), { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.2, 0)), painsplitMissText, [], 24);
                done(action);
                return;
            }
            var foe = world.observe(target);
            if (foe === null) { done(action); return; }
            // 执行复查真实射程与视线；起手之后躲到墙后或跑出射程就不补算。
            if (self.position().minus(foe.position()).length() > p("painsplit", "reach", action)
                || !world.clear(self.position(), foe.position())) {
                WorldFeedback.emit(world, painsplitScene, 1, self.position(), { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.2, 0)), painsplitMissText, [], 24);
                done(action);
                return;
            }
            sound(action, "minecraft:entity.evoker.cast_spell");
            var result = painsplitApply(world, actor, target, floor);
            if (result === null) { done(action); return; }

            var payer = result.payerSelf ? actor : target;
            var receiver = result.payerSelf ? target : actor;
            var payerBody = world.observe(payer), receiverBody = world.observe(receiver);
            var reference = result.reference;
            if (payerBody !== null && receiverBody !== null && result.loss > 0.001) {
                var from = payerBody.position(), to = receiverBody.position();
                var span = from.minus(to).length();
                var unit = span < 0.01 ? WorldCombat.point(0, 1, 0) : to.minus(from).unit();
                var path = [String(payer.ref()), String(receiver.ref())];
                // 流动粒子数按「实际抽到的生命 / 双方较大上限」派生：抽得越多越密，部分抵抗就更细。
                var flow = Math.max(3, Math.min(90, Math.round(motes * (0.35 + (result.loss / reference) * 1.8))));
                WorldFeedback.emit(world, painsplitScene, 1, from, { moment: "drain",
                    point: [from.x(), from.y(), from.z()], direction: [unit.x(), unit.y(), unit.z()],
                    path: path, span: span, flow: flow, scale: scale }, 30);
                sound(action, "minecraft:entity.player.hurt");
                if (result.heal > 0.001) {
                    var arrive = Math.max(2, Math.min(60, Math.round(motes * (0.3 + (result.heal / reference) * 1.8))));
                    WorldFeedback.emit(world, painsplitScene, 1, to, { moment: "settle",
                        point: [to.x(), to.y(), to.z()], arrive: arrive, scale: scale }, 26);
                }
            } else if (payerBody !== null && result.refused) {
                // 抽血被拒绝：痛线从中间断开，不生成任何回流。
                var broken = payerBody.position().plus((receiverBody === null ? payerBody : receiverBody).position().minus(payerBody.position()).scale(0.5));
                WorldFeedback.emit(world, painsplitScene, 1, broken, { moment: "refused",
                    point: [broken.x(), broken.y(), broken.z()], scale: scale }, 18);
            } else if (self !== null) {
                WorldFeedback.emit(world, painsplitScene, 1, self.position(), { moment: "flat", scale: scale }, 18);
            }
            if (result.selfChange !== 0) WorldFeedback.text(world, self.position().plus(WorldCombat.point(0, 1.15, 0)),
                result.selfChange > 0 ? painsplitGainText : painsplitLossText, [painsplitRound(Math.abs(result.selfChange))], 30);
            if (result.targetChange !== 0) WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)),
                result.targetChange > 0 ? painsplitGainText : painsplitLossText, [painsplitRound(Math.abs(result.targetChange))], 30);
            if (result.refused) WorldFeedback.text(world, payerBody === null ? self.position() : payerBody.position().plus(WorldCombat.point(0, 1.0, 0)),
                painsplitBlockedText, [], 26);
            if (result.flat) WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), painsplitFlatText, [], 26);
            done(action);
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("painsplit", "reach", pokemon) : 5, geometry: "line", style: "link", color: 0xFF6B5A, label: "痛线" };
        }
    });
}
