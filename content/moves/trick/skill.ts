/**
 * 戏法 / trick —— 注册与动作。
 *
 * 念头的形状：三幕。
 *   起（windup，提交前）：故布疑阵——先向目标抛出一撮假印记，把它的注意力牵到不存在的「那一手」上。
 *   连（execute，提交后）：执行时按现场真实位置复查射程与视线，心线在两颗战斗者之间拉直，两端各亮一圈；
 *       交换沿这条线发生，双方都不动。
 *   换（结算）：只有原子原生装备事务确认成功，两件当前真实持有物才各沿心线飞向对方，手里各落一圈落定光。
 *
 * 输入是中性 `aim`：可以明确点选友方或敌方来换装，也可以只朝一个点/空处出手（落空）。
 * 交换的门槛是真拿到的那条线：执行时目标已躲到墙后、走出射程或中间被另一具身体挡下，就只断线不假换。
 * 与同为「交换持有物」的掉包分开：戏法是超能、远程、从容，自己不动，用射程与视线换一手；
 * 掉包是恶属性、贴身掠过、一闪即换，用位移冒险换速度（见 switcheroo）。
 *
 * 交换走统一的原子原生装备事务（equipmentExchange），宝可梦携带物与原版生物/玩家的主副手同一契约；
 * 不复制、不凭空生成；两边都空、目标黏着或被查封（embargo）时不发生，只留下一次落空。
 * 交易成功的物品飞行由独立的 actor 生命周期效果托管，动作结束后仍把这一段飞完，不被 done 立即清掉。
 */
namespace PokemonSkills {
    const trickScene = "world_combat:move_trick";
    const trickArcEffect = "world_combat:move_trick_arc";
    const trickSwapText = "world_combat.move.trick.text.swap";
    const trickEmptyText = "world_combat.move.trick.text.empty";
    const trickGuardText = "world_combat.move.trick.text.guard";
    const trickMissText = "world_combat.move.trick.text.miss";

    /** 交易效果的载荷：两件真实物品 id（可为空字符串）、心尘与体型缩放，以及接触点。 */
    function trickArcData(json: string): string {
        var value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3 ||
            !value.point.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            throw new Error("Invalid trick arc point");
        ["motes", "scale"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid trick arc state");
        });
        return JSON.stringify(value);
    }

    /** 一件真实持有物沿心线飞向对方：用托管效果作用域里的原生投射物，外观就是这件物品本身。 */
    function trickArcFlight(world: CombatWorld, state: any, from: CombatObservation, to: CombatActor, itemId: string, ticks: number): void {
        var target = world.observe(to);
        if (target === null) return;
        var origin = from.position().plus(WorldCombat.point(0, from.height() * 0.6, 0));
        var delta = target.position().plus(WorldCombat.point(0, target.height() * 0.6, 0)).minus(origin);
        var distance = delta.length();
        var heading = distance < 0.05 ? WorldCombat.point(0, 1, 0) : delta.unit();
        var speed = Math.max(0.35, Math.min(1.6, distance / Math.max(4, ticks * 0.6)));
        var appearance = JSON.stringify({ item: itemId, scale: 1, glow: true, pierce: 1,
            homing: { target: String(to.ref()), turn: 140 } });
        var flight = world.projectile(origin, heading.scale(speed), 0, 0.18, Math.max(1.5, distance + 1.0), ticks,
            "hit", "complete", JSON.stringify({ item: itemId }), appearance);
        if (flight) WorldFeedback.emit(world, trickScene, 1, origin,
            { moment: "trade", projectile: flight, item: itemId, target: String(to.ref()),
                motes: Math.round(state.motes), scale: state.scale }, 34);
    }

    WorldCombat.effect(trickArcEffect, 1, 60, "actor", trickArcData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(trickArcEffect, "start", function (effect) {
        var world = effect.world(), self = effect.source(), foe = effect.target();
        var mine = world.observe(self), theirs = world.observe(foe);
        if (mine === null || theirs === null) { effect.end(); return; }
        var state = JSON.parse(effect.state());
        var ticks = Math.max(6, effect.remaining() - 2);
        if (state.mine) trickArcFlight(world, state, mine, foe, String(state.mine), ticks);
        if (state.theirs) trickArcFlight(world, state, theirs, self, String(state.theirs), ticks);
    });
    WorldCombat.effectHandler(trickArcEffect, "hit", function () { });
    WorldCombat.effectHandler(trickArcEffect, "complete", function () { });

    define({
        id: "trick",
        name: "戏法",
        description: "拉直一条超能心线，隔空把自己和目标的持有物对调：自己不必移动，只要看清目标、够得到它。可以明确选择友方或敌方换装；点在空处或墙后只断线不换。手快的人起手更短，特攻与等级高的个体拉得更远。",
        uses: ["远距离把对手的好东西换过来", "把自己带着的累赘塞给对手", "和队友明确换装，或空手时从远处的对手身上换一件持有物"],
        kind: "aim",
        range: 6.5,
        maxRange: 9,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 40,
        style: "trick",
        stationary: true,
        defaults: { snap: false, ai: { maxChase: 10, leaveStation: false, tradeOnly: false } },
        fields: [flag("snap", "瞬时抓取")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["trick"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("trick", "feint", context)), recover: Math.round(p("trick", "recover", context)),
                cooldown: Math.round(p("trick", "cooldown", context)), active: 0, range: p("trick", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            var world = action.sense(), actor = action.actor(), target = action.target();
            var self = world.observe(actor);
            if (self === null) return "invalid-target";
            // 中性 aim：没有选中生物（点在空处）也允许出手，只在执行时落空。
            if (target === null || target === undefined) return "";
            if (String(target.ref()) === String(actor.ref())) return "invalid-target";
            if (!world.valid(target)) return "invalid-target";
            var body = world.observe(target);
            if (body === null) return "invalid-target";
            if (self.position().minus(body.position()).length() > p("trick", "reach", action) + 0.3) return "out-of-range";
            if (!world.clear(self.position(), body.position())) return "target-not-visible";
            if (trickHeldOf(world, actor) === null && trickHeldOf(world, target) === null) return "no-item";
            return "";
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var target = action.target();
            action.present("world_combat:trick:" + action.id(), trickScene, 1, action.targetPosition(), JSON.stringify({
                moment: "feint", target: target === null ? "" : String(target.ref()), scale: scale,
                decoys: Math.round(p("trick", "decoys", action)), motes: Math.round(p("trick", "motes", action)) }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            var world = action.world(), actor = action.actor(), target = action.target();
            var self = world.observe(actor);
            if (self === null) { done(action); return; }
            var motes = Math.round(p("trick", "motes", action));
            var scale = (self.width() + self.height()) / 2.3;
            var reach = p("trick", "reach", action);
            var selfPosition = self.position();

            /** 一次落空：断线/空挥，绝不假造交换。 */
            function fizzle(at: CombatPoint, text: string): void {
                WorldFeedback.emit(world, trickScene, 1, at, { moment: "fizzle", scale: scale,
                    target: target !== null && target !== undefined ? String(target.ref()) : "" }, 22);
                WorldFeedback.text(world, selfPosition.plus(WorldCombat.point(0, 1.2, 0)), text, [], 24);
                sound(action, "minecraft:entity.villager.no");
                done(action);
            }

            if (target === null || target === undefined) { fizzle(self.position(), trickMissText); return; }
            if (!world.valid(target) || String(target.ref()) === String(actor.ref())) { fizzle(self.position(), trickMissText); return; }
            var foe = world.observe(target);
            if (foe === null) { fizzle(self.position(), trickMissText); return; }

            // 执行时复查现场：用真实位置重算射程与视线，起手后躲墙、走远或被人挡在中间都不会再换。
            var span = self.position().minus(foe.position()).length();
            var ray = action.trace(self.position(), foe.position(), 0.3, true);
            var lander = ray.hitEntity() ? ray.target() : null;
            if (span > reach + 0.3 || ray.blocked()
                || lander === null || String(lander.ref()) !== String(target.ref())) {
                fizzle(self.position(), trickMissText);
                return;
            }

            sound(action, "minecraft:entity.illusioner.cast_spell");
            WorldFeedback.emit(world, trickScene, 1, self.position(), { moment: "link", target: String(target.ref()),
                path: ["source", "target"], span: span, motes: motes, scale: scale }, 28);

            // 取执行时双方真实快照；两边都空则只留一次空手落空。
            var mine = trickHeldOf(world, actor), theirs = trickHeldOf(world, target);
            if (mine === null && theirs === null) { fizzle(foe.position(), trickEmptyText); return; }

            if (trickExchange(world, actor, target)) {
                var ticks = Math.max(12, Math.round(span / 0.9) + 8);
                world.effect(trickArcEffect, target, JSON.stringify({ mine: mine === null ? "" : mine.id,
                    theirs: theirs === null ? "" : theirs.id, motes: motes, scale: scale,
                    point: [foe.position().x(), foe.position().y(), foe.position().z()] }), ticks);
                WorldFeedback.emit(world, trickScene, 1, foe.position(), { moment: "settle", target: String(target.ref()),
                    scale: scale, motes: Math.round(motes * 0.7) }, 26);
                WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.0, 0)), trickSwapText, [], 28);
                sound(action, "minecraft:entity.allay.item_taken");
            } else {
                fizzle(foe.position(), trickBlocked(world, target) ? trickGuardText : trickEmptyText);
                return;
            }
            done(action);
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("trick", "reach", pokemon) : 6.5, geometry: "line", style: "trick", color: 0xC77DFF, label: "戏法心线" };
        }
    });
}
