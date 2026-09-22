/**
 * 拍落 / knockoff —— 注册与动作。
 *
 * 念头两幕：一幕高举（提交前 `windup`，把手臂抬到身后/头顶，碎屑从地面被带起），一幕砸下（提交后压向目标，
 * 命中时若对方手里有东西，先把那件道具整个取走、以真实掉落物抛出（带初速，由原生掉落物自己翻滚落地），
 * 再结算这一拍；对方携带持有物时本击 ×1.5。对手空手时只是一记普通重击。
 * 掉落物落在世界里、有可拾取延迟，谁都可能再捡起——这正是本招留下的东西。
 * 道具的取走与抛出走统一的原生装备事务（equipmentDrop）：宝可梦携带物与原版生物/玩家的主副手同一契约，
 * 移除与生成掉落物同属一次 CAS；原生拒绝时不扣掉原物，也不凭空生成。
 */
namespace PokemonSkills {
    const knockoffScene = "world_combat:move_knockoff";
    const knockoffKnockText = "world_combat.move.knockoff.text.knock";
    const knockoffBareText = "world_combat.move.knockoff.text.bare";
    const knockoffRefusedText = "world_combat.move.knockoff.text.refused";
    const knockoffMissText = "world_combat.move.knockoff.text.miss";

    /**
     * 把被拍掉的道具以真实掉落物抛出：`scatter` 是真正的落点距离——用弹道解出飞向该点的初速，
     * 原生掉落物自己沿这条低弧翻滚落地，过 `pickup` 刻才能被捡起。移除与生成在同一事务里完成；
     * 原生拒绝时返回失败、原物留在原槽。
     */
    function knockoffToss(scope: CombatWorld, target: CombatActor, point: CombatPoint, held: NativeItems.Held,
        direction: CombatPoint, scatter: number, tossSpeed: number, pickup: number): NativeItems.Receipt {
        var flat = WorldCombat.point(direction.x(), 0, direction.z());
        if (flat.length() < 0.01) flat = WorldCombat.point(0, 0, 1);
        var destination = point.plus(flat.unit().scale(scatter));
        var arc = LivingActions.ballistic(point.plus(WorldCombat.point(0, 0.4, 0)), destination, tossSpeed, 0.04);
        var velocity = arc ? arc.scale(tossSpeed) : flat.unit().scale(tossSpeed);
        return NativeItems.dropHeld(scope, target, held, JSON.stringify({ pickupDelay: Math.max(0, Math.round(pickup)),
            velocity: [velocity.x(), velocity.y(), velocity.z()] }));
    }

    function knockoffStrike(action: CombatAction, done: (current: CombatAction) => void): void {
        var world = action.world(), actor = action.actor();
        var direction = aim(action), length = p("knockoff", "reach", action), speed = p("knockoff", "step", action);
        var radius = p("knockoff", "collisionRadius", action), push = p("knockoff", "push", action);
        var scatter = p("knockoff", "scatter", action), tossSpeed = p("knockoff", "tossSpeed", action);
        var pickup = p("knockoff", "pickup", action), motes = p("knockoff", "motes", action);
        var body = world.observe(actor), scale = body ? (body.width() + body.height()) / 2.3 : 1;
        sound(action, "minecraft:entity.player.attack.weak");
        WorldFeedback.emit(world, knockoffScene, 1, action.origin(), { moment: "raise", scale: scale, motes: Math.round(motes) }, 28);
        var travelled = 0;
        function advance(current: CombatAction): void {
            var scope = current.world(), origin = current.origin();
            var delta = direction.scale(Math.min(speed, length - travelled));
            var hit = current.trace(origin, origin.plus(delta.scale(p("knockoff", "traceAhead", current))), radius);
            if (hit.hitEntity()) {
                var target = hit.target();
                if (target === null || scope.friendly(target)) { done(current); return; }
                var point = hit.position();
                var before = scope.observe(target), maximum = before ? Math.max(1, before.maxHealth()) : 1;
                var held = NativeItems.heldOf(scope, target);
                var power = p("knockoff", "smash", current) * (held !== null ? 1.5 : 1);
                var landed = impact(current, hit, "knockoff", power);
                var after = scope.valid(target) ? scope.observe(target) : null;
                var dealt = before ? before.health() - (after ? after.health() : 0) : 0;
                var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
                WorldFeedback.emit(scope, knockoffScene, 1, point, { moment: "smash", target: String(target.ref()),
                    intensity: intensity, scale: scale, motes: Math.round(motes * (0.7 + intensity * 0.2)),
                    armed: held !== null ? 1 : 0 }, 32);
                sound(current, "cobblemon:impact.dark");
                var targetBody = scope.valid(target) ? scope.observe(target) : null;
                var knocked = landed && held !== null && targetBody !== null
                    && knockoffToss(scope, target, targetBody.position(), held, direction, scatter, tossSpeed, pickup).ok;
                if (knocked && targetBody !== null) {
                    WorldFeedback.emit(scope, knockoffScene, 1, targetBody.position(),
                        { moment: "knock", direction: [direction.x(), direction.y(), direction.z()], scale: scale,
                            scatter: scatter, motes: Math.round(motes) }, 34);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), knockoffKnockText, [], 30);
                    sound(current, "minecraft:item.trident.throw");
                } else if (landed && held !== null) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), knockoffRefusedText, [], 28);
                } else {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), knockoffBareText, [], 28);
                }
                if (landed && scope.valid(target)) scope.displace(target, direction.scale(push));
                done(current);
                return;
            }
            var moved = scope.displace(actor, delta);
            travelled += moved;
            if (hit.blocked() || moved < p("knockoff", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(scope, knockoffScene, 1, hit.position(), { moment: "miss", scale: scale }, 20);
                var self = scope.observe(actor);
                if (self !== null) WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.1, 0)), knockoffMissText, [], 22);
                done(current);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        id: "knockoff",
        name: "拍落",
        description: "举臂重拍，把对手的持有物整个拍飞、落地成可拾取的掉落物；对手携带道具时本击伤害更高。",
        uses: ["拍掉对手的持有物", "对持物目标的一次沉重近身打击", "把强力道具打成地上的东西"],
        kind: "enemy",
        range: 3,
        maxRange: 4.5,
        prepare: 6,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "dash",
        defaults: { far: false, ai: { maxChase: 12, leaveStation: false, denyItems: true } },
        fields: [flag("far", "挑飞得远")],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["knockoff"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var far = !!(config && config.far);
            return { prepare: Math.round(p("knockoff", "charge", context)), recover: 8 + (far ? 2 : 0), cooldown: 28, active: 0,
                range: p("knockoff", "reach", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            var body = action.sense().observe(action.actor());
            var scale = body ? (body.width() + body.height()) / 2.3 : 1;
            var target = action.target();
            var armed = target !== null && target !== undefined && knockoffHeldOf(action.sense(), target) !== null;
            action.present("world_combat:knockoff:" + action.id(), knockoffScene, 1, action.origin(), JSON.stringify({
                moment: "raise", scale: scale, armed: armed ? 1 : 0 }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            knockoffStrike(action, done);
        },
        indicator: function () { return { radius: 3, geometry: "line", style: "dash", label: "拍落" }; }
    });
}
