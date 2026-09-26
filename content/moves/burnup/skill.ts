/** Spend fire at release, then advance the actual 3D white-flame frontier once through each body. */
namespace PokemonSkills {
    define({
        id: burnupId,
        cooldownParameter: "recharge",
        name: "Burn Up",
        description: "把全身的火向内收拢，再朝身前喷出一道白焰锥面：真实中心窄芯首触者吃满，侧面的敌人吃侧焰。喷完施法者真的燃尽——一段时间里不再是火属性，也点不着第二发；只有自己带火属性时才能发动。",
        uses: ["一发烧尽面前一条锥面", "用失去本系换一次重击", "把挤在身前的对手一起点燃"],
        kind: "aim",
        range: 6.8,
        maxRange: 12.6,
        prepare: 8,
        active: 0,
        recover: 10,
        cooldown: 30,
        style: "fire",
        defaults: { banked: false, ai: { maxChase: 10, holdUntil: 0.6 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(burnupId, "reach", pokemon) : 6.8, geometry: "cone", style: "fire", color: 0xFFB347, label: "燃尽" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[burnupId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(burnupId, "kindle", context)),
                recover: Math.round(p(burnupId, "settle", context)),
                cooldown: Math.round(p(burnupId, "recharge", context)),
                active: 0,
                range: p(burnupId, "reach", context)
            };
        },
        ready: function (action, config) {
            return burnupHasFireNow(action.sense(), action.actor()) ? "" : "not-fire";
        },
        windup: function (action, config, prepare) {
            action.present("burnup:kindle", burnupScene, 1, action.origin(),
                JSON.stringify({ moment: "kindle", banked: config && config.banked === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), origin = action.origin(), direction = aim(action);
            const reach = p(burnupId, "reach", action), cone = p(burnupId, "cone", action), speed = p(burnupId, "speed", action);
            const power = p(burnupId, "outburst", action), share = p(burnupId, "share", action), hold = Math.round(p(burnupId, "hold", action));
            const ember = p(burnupId, "ember", action), features = damageFeatures(burnupId, "outburst");
            // Resolve real launch type first, including execution-wide type changes, before consuming Fire.
            const released = PokemonDamage.sourceMetadata(world, action.actor(), move, features, action);
            const sameType = PokemonDamage.sameType(PokemonDamage.combatants.read(world, action.actor()), released.type);
            if (!burnupSpend(world, action.actor(), hold)) { done(action); return; }
            const seen: { [ref: string]: boolean } = {};
            let travelled = 0, coreSpent = false, touched = 0;
            const tangent = Math.tan(cone * Math.PI / 360), scenes = WorldFeedback.actionScenes(burnupScene);
            sound(action, "cobblemon:move.eruption.actor");
            WorldFeedback.text(world, origin, burnupSpentText, [Math.round(hold / 2) / 10], 32);
            function advance(current: CombatAction): void {
                const scope = current.world(), next = Math.min(reach, travelled + speed);
                const from = origin.plus(direction.scale(travelled)), end = origin.plus(direction.scale(next));
                const front = WorldGeometry.bodyFrustum(from, end, 0.25 + travelled * tangent, 0.25 + next * tangent);
                const core = coreSpent ? null : current.trace(from, end, 0.2), central = core && core.hitEntity() ? core.target() : null;
                if (central) coreSpent = true;
                WorldGeometry.selectBodies(scope, front, (enemy, body) => {
                    const ref = String(enemy.ref());
                    if (seen[ref] || ref === String(current.actor().ref()) || scope.friendly(enemy)) return;
                    const contact = scope.closestPoint(enemy, end); if (!scope.clear(origin, contact)) return;
                    seen[ref] = true;
                    const main = central !== null && ref === String(central.ref());
                    if (!hurt(current, enemy, burnupId, power * (main ? 1 : share), { damage: damageSpec(burnupId, "outburst"),
                        sameTypeMultiplier: sameType, sameTypeType: released.type, knockback: false })) return;
                    touched++;
                    WorldFeedback.emit(scope, burnupScene, 1, contact, { moment: main ? "scorch" : "splash", target: ref }, 30);
                });
                const boundary = front.far.map(point => { const wall = scope.clipBlocks(origin, point), actual = wall ? wall.position() : point;
                    return [actual.x(), actual.y(), actual.z()]; });
                boundary.push(boundary[0]);
                scenes.show(current, "burst", end, { moment: "burst", path: boundary, ember: ember,
                    direction: [direction.x(), direction.y(), direction.z()] });
                travelled = next;
                if (travelled >= reach) {
                    WorldFeedback.text(scope, current.origin(), touched ? burnupBlastText : burnupFizzleText, touched ? [touched] : [], 28);
                    scenes.finish(current, done); return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
