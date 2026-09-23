/**
 * 掉包 / switcheroo —— 注册与动作。
 *
 * 念头的形状：两幕。
 *   起（windup，提交前）：低伏压身，脚下与身后拉出一片暗色速度线——几乎没有起手，只是把身体交给地面。
 *   掠（execute，提交后）：贴着地面朝瞄准方向掠过去，途中拖一条暗影；撞上活体的一瞬，两件持有物已经在空中
 *       易手（各沿一条短弧飞向对方），随后或触到即停，或按 through 继续冲到目标身后。
 * 与同为「交换持有物」的戏法分开：戏法是超能远程、从容拉线、自己不动；掉包是恶属性贴身位移、起手极短、更冒险。
 * 交换走统一的原子原生装备事务（equipmentExchange），宝可梦携带物与原版生物/玩家的主副手同一契约；
 * 不复制、不凭空生成；两边都空、目标黏着或被查封（embargo）时只当一次擦身而过。
 */
namespace PokemonSkills {
    const switcherooScene = "world_combat:move_switcheroo";
    const switcherooSwapText = "world_combat.move.switcheroo.text.swap";
    const switcherooEmptyText = "world_combat.move.switcheroo.text.empty";
    const switcherooGuardText = "world_combat.move.switcheroo.text.guard";
    const switcherooMissText = "world_combat.move.switcheroo.text.miss";

    /** 一件持有物沿一条短弧飞向对方（此刻已换手，这只是画面）。 */
    function switcherooArc(current: CombatAction, from: CombatActor, to: CombatActor, itemId: string): void {
        var world = current.world(), theirs = world.observe(from), mine = world.observe(to);
        if (theirs === null || mine === null) return;
        var origin = theirs.position().plus(WorldCombat.point(0, theirs.height() * 0.6, 0));
        var delta = mine.position().plus(WorldCombat.point(0, mine.height() * 0.6, 0)).minus(origin);
        var velocity = (delta.length() < 0.05 ? aim(current) : delta.unit()).scale(1.1);
        var flight = current.projectile(origin, velocity, 0, 0.2, 12, 22, function () { }, function () { },
            JSON.stringify({ item: itemId, scale: 1, glow: true, pierce: 1, homing: { target: String(to.ref()), turn: 120 } }));
        WorldFeedback.emit(world, switcherooScene, 1, origin, { moment: "trade", projectile: flight, item: itemId,
            target: String(to.ref()) }, 26);
    }

    function switcherooPass(action: CombatAction, config: any, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("switcheroo", "reach", action), speed = p("switcheroo", "step", action);
        var radius = p("switcheroo", "collisionRadius", action), push = p("switcheroo", "push", action);
        var motes = Math.round(p("switcheroo", "motes", action));
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        var through = !!(config && config.through);
        var mine = switcherooHeldOf(world, actor);
        sound(action, "cobblemon:move.quickattack.actor");
        WorldFeedback.emit(world, switcherooScene, 1, action.origin(),
            { moment: "blur", direction: [direction.x(), direction.y(), direction.z()], scale: scale, motes: motes }, 22);
        var travelled = 0;
        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var hit = current.trace(origin, origin.plus(delta.scale(p("switcheroo", "traceAhead", current))), radius);
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { done(current); return; }
                var point = hit.position();
                var mineNow = switcherooHeldOf(scope, actor), theirsNow = switcherooHeldOf(scope, target);
                var swapped = switcherooExchange(scope, actor, target);
                if (swapped) {
                    if (mineNow !== null) switcherooArc(current, actor, target, mineNow.id);
                    if (theirsNow !== null) switcherooArc(current, target, actor, theirsNow.id);
                    WorldFeedback.emit(scope, switcherooScene, 1, point, { moment: "trade", target: String(target.ref()),
                        scale: scale, motes: Math.round(motes * 0.8) }, 26);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), switcherooSwapText, [], 26);
                    sound(current, "minecraft:entity.allay.item_taken");
                } else {
                    WorldFeedback.emit(scope, switcherooScene, 1, point, { moment: "trade", target: String(target.ref()),
                        scale: scale, motes: Math.round(motes * 0.5), empty: 1 }, 22);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)),
                        switcherooBlocked(scope, target) ? switcherooGuardText : switcherooEmptyText, [], 24);
                }
                if (scope.valid(target)) scope.displace(target, direction.scale(push));
                if (through) {
                    var overshoot = p("switcheroo", "overshoot", current);
                    if (scope.valid(actor)) scope.displace(actor, direction.scale(overshoot));
                }
                done(current);
                return;
            }
            var moved = scope.displace(actor, delta);
            travelled += moved;
            if (hit.blocked() || moved < p("switcheroo", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, switcherooScene, 1, hit.position(), { moment: "miss", scale: scale,
                    direction: [direction.x(), direction.y(), direction.z()] }, 18);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), switcherooMissText, [], 22);
                done(current);
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
        description: "以一闪而过的速度贴身掠过，撞上的一瞬把彼此手里的持有物对调；几乎不用蓄势，冷却也短，代价是必须贴上去。手越快掠得越远、换得更利落。",
        uses: ["贴上去把对手的道具换走", "把累赘在近身缠斗中塞给对手", "穿过对手完成换手后抢到它身后"],
        kind: "enemy",
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
            if (target === null || target === undefined || !world.valid(target) || world.friendly(target)) return "invalid-target";
            if (world.observe(target) === null || world.observe(actor) === null) return "invalid-target";
            if (switcherooBlocked(world, target)) return "held-guard";
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
