/**
 * 地球上投 / seismictoss 的出手方式。
 *
 * 念头的形状：站定、抓住对手（windup 预告 → seize 抓握）→ 把它沿一条陡弧甩出去（hurl）→ 落地砸实（slam，
 * 砸地式把对手钉住）。伤害在老鹰抓稳的那一刻直接结算，等于自己的等级；对手在空中那段无法反击。
 *
 * 三幕 + 收：windup → seize（抓握 holdTicks）→ hurl（飞行 slamDelay）→ slam。提交后才触碰世界。
 * 平地被墙挡住时抓不到（trace 被挡），扑空收势。
 */
namespace PokemonSkills {
    const seismictossScene = "world_combat:move_seismictoss";
    const seismictossHoldText = "world_combat.move.seismictoss.text.hold";
    const seismictossSlamText = "world_combat.move.seismictoss.text.slam";
    const seismictossMissText = "world_combat.move.seismictoss.text.miss";

    function seismictossVector(direction: CombatPoint): number[] { return [direction.x(), direction.y(), direction.z()]; }

    define({
        id: "seismictoss",
        name: "Seismic Toss",
        description: "抓取投掷：扣住对手、借重力把它甩出去，造成等于自己等级的固定伤害，再把对手抛上一条弧线砸向地面。伤害不看对手防御，只看属性免疫；砸地式把这一甩压短并让对手落地后被钉住。",
        uses: ["抓住对手把它甩出去", "把敌人抛离掩体或扔下高台", "用等级伤害处理高防目标"],
        kind: "enemy",
        range: 2.8,
        maxRange: 4.6,
        prepare: 10,
        active: 44,
        recover: 14,
        cooldown: 56,
        style: "throw",
        defaults: { slam: false, ai: { maxChase: 7, finish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("seismictoss", "collisionRadius", pokemon), geometry: "line", style: "throw", color: 0xC98B3A, label: "地球上投" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["seismictoss"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("seismictoss", "seize", context),
                recover: p("seismictoss", "recover", context),
                cooldown: p("seismictoss", "cooldown", context),
                range: p("seismictoss", "collisionRadius", context) + 2.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_seismictoss:brace", seismictossScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", slam: !!(config && config.slam) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const slam = !!(config && config.slam);
            const damage = p("seismictoss", "damage", action);
            const radius = p("seismictoss", "collisionRadius", action);
            const holdTicks = Math.max(1, Math.round(p("seismictoss", "holdTicks", action)));
            const hurlXZ = p("seismictoss", "hurlXZ", action);
            const hurlUp = p("seismictoss", "hurlUp", action);
            const slamDelay = Math.max(3, Math.round(p("seismictoss", "slamDelay", action)));
            const shockwave = p("seismictoss", "shockwave", action);
            const pinTicks = Math.max(1, Math.round(p("seismictoss", "pinTicks", action)));
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const target = action.target();
            const aimPoint = action.targetPosition();
            const reach = Math.min(body.position().minus(aimPoint).length() + 0.5, action.range() + 0.4);
            const direction = aim(action);
            const hit = action.trace(body.position(), body.position().plus(aimPoint.minus(body.position()).unit().scale(Math.max(0.01, reach))), radius + 0.3);
            const victim = hit.hitEntity() ? hit.target() : null;
            const refused = victim === null || world.friendly(victim) || target === null || !world.valid(target);
            let settled = false;

            sound(action, refused ? "minecraft:entity.player.attack.sweep" : "minecraft:entity.iron_golem.attack");
            if (refused) {
                WorldFeedback.emit(world, seismictossScene, 1, aimPoint, { moment: "miss", scale: radius / 0.5 }, 22);
                WorldFeedback.text(world, aimPoint.plus(WorldCombat.point(0, 1.2, 0)), seismictossMissText, [], 22);
                done(action);
                return;
            }

            const victimRef = String(victim!.ref());
            const flat = WorldCombat.point(hit.position().x() - body.position().x(), 0, hit.position().z() - body.position().z());
            const throwDirection = flat.length() < 0.01 ? direction : flat.unit();
            const landed = seismictossRawHit(action, victim!, damage, true);
            const victimBody = world.observe(victim!);
            const grip = victimBody === null ? hit.position() : victimBody.position();
            WorldFeedback.emit(world, seismictossScene, 1, grip,
                { moment: "seize", target: victimRef, count: Math.round(10 + Math.min(40, damage * 0.6)), scale: radius / 0.5 }, 26);
            WorldFeedback.text(world, grip.plus(WorldCombat.point(0, 1.2, 0)), seismictossHoldText, [Math.round(damage)], 26);
            if (!landed) { done(action); return; }

            function slamDown(current: CombatAction): void {
                if (settled) { done(current); return; }
                settled = true;
                const scope = current.world();
                const thrown = scope.actor(victimRef);
                if (thrown !== null && scope.valid(thrown)) {
                    const facts = scope.observe(thrown);
                    if (facts !== null) {
                        WorldFeedback.emit(scope, seismictossScene, 1, facts.position(),
                            { moment: "slam", target: victimRef, count: Math.round(14 + shockwave * 18), scale: shockwave / 0.9 }, 28);
                        WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.2, 0)), seismictossSlamText, [], 24);
                        if (slam) WorldEffects.apply(scope, thrown, "rooted", {}, pinTicks);
                    }
                }
                sound(current, slam ? "minecraft:item.mace.smash_ground_heavy" : "minecraft:block.anvil.land");
                done(current);
            }

            function hurl(current: CombatAction): void {
                const scope = current.world();
                const thrown = scope.actor(victimRef);
                if (thrown === null || !scope.valid(thrown)) { slamDown(current); return; }
                scope.motion(thrown, WorldCombat.point(throwDirection.x() * hurlXZ, hurlUp, throwDirection.z() * hurlXZ), false);
                WorldFeedback.emit(scope, seismictossScene, 1, scope.observe(thrown)!.position(),
                    { moment: "hurl", target: victimRef, direction: seismictossVector(throwDirection), scale: radius / 0.5 }, slamDelay + 12);
                sound(current, "minecraft:entity.wind_charge.throw");
                current.after(slamDelay, slamDown);
            }

            WorldEffects.apply(world, victim!, "rooted", {}, holdTicks);
            action.after(holdTicks, hurl);
        }
    });
}
