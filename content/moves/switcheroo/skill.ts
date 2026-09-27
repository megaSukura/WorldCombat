/**
 * 掉包 / switcheroo —— 注册与动作。
 *
 * 念头的形状：两幕。
 *   起（windup，提交前）：低伏压身，脚下与身后拉出一片暗色速度线——几乎没有起手，只是把身体交给地面。
 *   掠（execute，提交后）：贴着地面朝瞄准方向掠过去，途中拖一条暗影；撞上活体的一瞬，只有真的擦到的那具身体
 *       才与它交换持有物（用接触时的真实快照走原子事务），两件物品各从身体外侧沿直线飞向对方（只是画面，穿身而过不与实体碰撞）；随后或触到即停，
 *       或按 through 用有限逐刻的真实身体推进继续冲，墙体与身体都按原生碰撞停在原处。
 *
 * 输入是中性 `aim`：可以空放（只当一次位移），也可以明确点选目标。交换与拒换只在实际首碰的那具身体上核实，
 * 让没被撞到的原目标特性不再阻止整招；友方挡路照样停下，不会被暗换物品。
 * 与同为「交换持有物」的戏法分开：戏法是超能远程、从容拉线、自己不动；掉包是恶属性贴身位移、起手极短、更冒险。
 *
 * 交换走统一的原子原生装备事务（equipmentExchange），宝可梦携带物与原版生物/玩家的主手/副手同一契约；
 * 不复制、不凭空生成；两边都空、目标黏着或被查封（embargo）时只当一次擦身而过，分别用 empty / reject 两幕区分。
 * 交易成功的物品飞行由独立的 actor 生命周期效果托管，动作结束后仍把这一段飞完，不被 done 立即清掉；飞行不结算、
 * 不参与实体碰撞，终点按当刻真实位置取定，与租约各自独立。
 */
namespace PokemonSkills {
    const switcherooScene = "world_combat:move_switcheroo";
    const switcherooArcEffect = "world_combat:move_switcheroo_arc";
    const switcherooSwapText = "world_combat.move.switcheroo.text.swap";
    const switcherooEmptyText = "world_combat.move.switcheroo.text.empty";
    const switcherooGuardText = "world_combat.move.switcheroo.text.guard";
    const switcherooFailText = "world_combat.move.switcheroo.text.fail";
    const switcherooMissText = "world_combat.move.switcheroo.text.miss";

    /** 交易效果的载荷：两件真实物品 id（可为空字符串）、火花与体型缩放，以及接触点。 */
    function switcherooArcData(json: string): string {
        var value = JSON.parse(json);
        if (!Array.isArray(value.point) || value.point.length !== 3 ||
            !value.point.every(function (n: any) { return typeof n === "number" && isFinite(n); }))
            throw new Error("Invalid switcheroo arc point");
        ["motes", "scale"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid switcheroo arc state");
        });
        return JSON.stringify(value);
    }

    /** 一件真实持有物从身体外侧飞向对方：用托管效果作用域里的原生投射物，外观就是这件物品本身，穿身而过不参与实体碰撞。 */
    function switcherooArcFlight(world: CombatWorld, state: any, from: CombatObservation, to: CombatActor, itemId: string, ticks: number): void {
        var target = world.observe(to);
        if (target === null) return;
        var origin = from.position().plus(WorldCombat.point(0, from.height() * 0.6, 0));
        var delta = target.position().plus(WorldCombat.point(0, target.height() * 0.6, 0)).minus(origin);
        var distance = delta.length();
        var heading = distance < 0.05 ? WorldCombat.point(0, 1, 0) : delta.unit();
        var speed = Math.max(0.4, Math.min(1.6, distance / Math.max(3, ticks * 0.6)));
        // 起点挪到身体外，避免从命中箱内部起飞就撞上自己；pierce 让这只是画面，不再和身体碰撞。
        var launch = origin.plus(heading.scale(Math.max(from.width(), from.height()) * 0.5 + 0.2));
        var appearance = JSON.stringify({ item: itemId, scale: 1, glow: true, pierce: true });
        var flight = world.projectile(launch, heading.scale(speed), 0, 0.18, Math.max(1.0, distance + 0.3), ticks,
            "hit", "complete", JSON.stringify({ item: itemId }), appearance);
        if (flight) WorldFeedback.emit(world, switcherooScene, 1, launch,
            { moment: "trade", projectile: flight, item: itemId, target: String(to.ref()),
                motes: Math.round(state.motes), scale: state.scale }, 26);
    }

    WorldCombat.effect(switcherooArcEffect, 1, 60, "actor", switcherooArcData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(switcherooArcEffect, "start", function (effect) {
        var world = effect.world(), self = effect.source(), foe = effect.target();
        var mine = world.observe(self), theirs = world.observe(foe);
        if (mine === null || theirs === null) { effect.end(); return; }
        var state = JSON.parse(effect.state());
        var ticks = Math.max(6, effect.remaining() - 2);
        if (state.mine) switcherooArcFlight(world, state, mine, foe, String(state.mine), ticks);
        if (state.theirs) switcherooArcFlight(world, state, theirs, self, String(state.theirs), ticks);
    });
    WorldCombat.effectHandler(switcherooArcEffect, "hit", function () { });
    WorldCombat.effectHandler(switcherooArcEffect, "complete", function () { });

    function switcherooPass(action: CombatAction, config: any, done: (current: CombatAction) => void): void {
        const movementScenes = WorldFeedback.actionScenes(switcherooScene);
        var world = action.world(), actor = action.actor();
        var aimed = aim(action);
        var horizontal = WorldCombat.point(aimed.x(), 0, aimed.z());
        var direction = horizontal.length() > 0.001 ? horizontal.unit() : aimed;
        var length = p("switcheroo", "reach", action), speed = p("switcheroo", "step", action);
        var radius = p("switcheroo", "collisionRadius", action), push = p("switcheroo", "push", action);
        var motes = Math.round(p("switcheroo", "motes", action));
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var through = !!(config && config.through);
        sound(action, "cobblemon:move.quickattack.actor");
        movementScenes.show(action, "blur", action.origin(), { moment: "blur", direction: [direction.x(), direction.y(), direction.z()], scale: scale, motes: motes });
        var travelled = 0;

        /** 交换后按 through 继续；余程拆成逐刻真实身体推进，撞墙或推不动就停在墙前。 */
        function residue(current: CombatAction): void {
            var overshoot = p("switcheroo", "overshoot", current);
            var minimum = p("switcheroo", "minimumMove", current);
            var passed = 0;
            function step(now: CombatAction): void {
                var scope = now.world();
                var delta = direction.scale(Math.min(speed, overshoot - passed));
                var swept = sweepStep(now, delta, radius), hit = swept.hit;
                var moved = swept.moved;
                if (hit.hitEntity() && swept.remaining.length() > 0.001) moved += scope.displace(actor, swept.remaining);
                passed += moved;
                if (hit.blocked() || moved < minimum || passed >= overshoot - 0.001) { movementScenes.finish(now, done); return; }
                now.after(1, step);
            }
            step(current);
        }

        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var swept = sweepStep(current, delta, radius);
            var hit = swept.hit;
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { movementScenes.finish(current, done); return; }
                var point = hit.position();
                // 只在实际首碰的这具身体上取执行时真实快照并走原子事务。
                var mineNow = switcherooHeldOf(scope, actor), theirsNow = switcherooHeldOf(scope, target);
                var swapped = switcherooExchange(scope, actor, target);
                if (swapped) {
                    var at = scope.observe(actor), foe = scope.observe(target);
                    var span = at !== null && foe !== null ? at.position().minus(foe.position()).length() : 1.5;
                    scope.effect(switcherooArcEffect, target, JSON.stringify({ mine: mineNow === null ? "" : mineNow.id,
                        theirs: theirsNow === null ? "" : theirsNow.id, motes: motes, scale: scale,
                        point: [point.x(), point.y(), point.z()] }), Math.max(10, Math.round(span / 1.0) + 8));
                    WorldFeedback.emit(scope, switcherooScene, 1, point, { moment: "trade", target: String(target.ref()),
                        scale: scale, motes: Math.round(motes * 0.8) }, 26);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), switcherooSwapText, [], 26);
                    sound(current, "minecraft:entity.allay.item_taken");
                } else {
                    // 双空与拒绝分开：双空只是两手空空地擦过，拒绝（黏着/查封/写入失败）要读成没换成。
                    var bothEmpty = mineNow === null && theirsNow === null;
                    var blocked = switcherooBlocked(scope, target) || NativeItems.sealed(scope, actor);
                    WorldFeedback.emit(scope, switcherooScene, 1, point,
                        { moment: bothEmpty ? "empty" : "reject", target: String(target.ref()),
                            scale: scale, motes: Math.round(motes * 0.5) }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)),
                        bothEmpty ? switcherooEmptyText : blocked ? switcherooGuardText : switcherooFailText, [], 24);
                }
                // 敌方被推走也走受击位移：原生抗击退/免推 Boss 不会被硬挪。
                if (scope.valid(target)) scope.hitDisplace(target, direction.scale(push));
                if (through) { residue(current); return; }
                movementScenes.finish(current, done);
                return;
            }
            var moved = swept.moved;
            travelled += moved;
            if (hit.blocked() || moved < p("switcheroo", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, switcherooScene, 1, hit.position(), { moment: "miss", scale: scale,
                    direction: [direction.x(), direction.y(), direction.z()] }, 18);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), switcherooMissText, [], 22);
                movementScenes.finish(current, done);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true,
        id: "switcheroo",
        name: "掉包",
        description: "以一闪而过的速度贴身掠过，撞上的一瞬把彼此手里的持有物对调；几乎不用蓄势，冷却也短，代价是必须贴上去。可以空放只当位移；交换只发生在真正撞到的那具身体上，撞到友方或被墙挡住就停下。手越快掠得越远、换得更利落。",
        uses: ["贴上去把对手的道具换走", "把累赘在近身缠斗中塞给对手", "空放当一次短位移，或开启穿身从对手身侧冲出"],
        kind: "aim",
        range: 3.2,
        maxRange: 6.5,
        prepare: 3,
        active: 0,
        recover: 4,
        cooldown: 22,
        style: "dash",
        defaults: { through: false, ai: { maxChase: 10, leaveStation: false, tradeOnly: false } },
        fields: [flag("through", "穿身而过")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["switcheroo"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return { prepare: Math.round(p("switcheroo", "charge", context)), recover: Math.round(p("switcheroo", "recover", context)),
                cooldown: Math.round(p("switcheroo", "cooldown", context)), active: 0, range: p("switcheroo", "reach", context) };
        },
        ready: function (action: CombatAction, config: any): string {
            var world = action.sense(), actor = action.actor(), target = action.target();
            if (world.observe(actor) === null) return "invalid-target";
            // 中性 aim：不选目标也能空掠；不因原目标的特性拒绝整招，实际交换只看首碰对象。
            if (target === null || target === undefined) return "";
            if (String(target.ref()) === String(actor.ref())) return "invalid-target";
            if (!world.valid(target)) return "invalid-target";
            return "";
        },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var target = action.target();
            action.present("world_combat:switcheroo:" + action.id(), switcherooScene, 1, action.origin(), JSON.stringify({
                moment: "blur", target: target === null ? "" : String(target.ref()), scale: scale,
                motes: Math.round(p("switcheroo", "motes", action)),
                armed: (switcherooHeldOf(action.sense(), action.actor()) !== null || target !== null && switcherooHeldOf(action.sense(), target) !== null) ? 1 : 0 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            switcherooPass(action, config, done);
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: pokemon ? p("switcheroo", "reach", pokemon) : 3.2, geometry: "line", style: "dash", color: 0x3B2E4A, label: "掉包掠线" };
        }
    });
}
