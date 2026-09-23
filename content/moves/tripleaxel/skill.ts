/**
 * 三旋击 / tripleaxel 的出手方式。
 *
 * 核心念头：原地转身，一圈扫出一脚——第一脚轻、第二脚重、第三脚最重；每脚独立掷命中，落空这串就停。
 * 它的身份是「旋转」：三脚都扫在身前同一段扇形里，所以站得近的第二个对手也会被旋到；
 * 与三连踢的分别就在这里——三连踢是朝前的窄走廊直踢，三旋击是宽弧横扫。
 *
 * 三拍：
 *   起（windup，提交前）：屈膝压身，脚边冰屑开始打旋。
 *   旋（kick，提交后）：每脚都转向目标，沿身前 `arc` 度、`reach` 格的扇形判定——扇形里的非友方各吃一记
 *       `kick`，第 n 脚威力 = kick × (1 + ramp × 已踢脚数)。每脚结算一次，间隔 `gap`。
 *   收（whiff / done）：任一脚掷空或扇形里没有对手，这串就停；三脚踢满自然收势。
 */
namespace PokemonSkills {
    /** 一脚扫过的扇形顶点：origin 加弧上采样点，判定（sector）与表现（polygon）共用同一组角度。 */
    function tripleaxelFan(origin: CombatPoint, direction: CombatPoint, radius: number, degrees: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const base = Math.atan2(heading.z(), heading.x());
        const half = Math.max(0, Math.min(180, degrees)) * Math.PI / 360;
        const samples = 9;
        const points: number[][] = [[origin.x(), origin.y(), origin.z()]];
        for (let index = 0; index < samples; index++) {
            const angle = base - half + half * 2 * (index / (samples - 1));
            points.push([origin.x() + Math.cos(angle) * radius, origin.y(), origin.z() + Math.sin(angle) * radius]);
        }
        return points;
    }

    define({
        id: tripleaxelId,
        cooldownParameter: "recharge",
        name: "Triple Axel",
        description: "A consecutive three-kick attack that becomes more powerful with each successful hit.",
        uses: ["原地旋身连踢三脚", "每中一脚，下一脚更重", "宽弧横扫照顾身旁的目标"],
        kind: "enemy",
        range: 2.8,
        maxRange: 4.2,
        prepare: 6,
        active: 0,
        recover: 7,
        cooldown: 30,
        maximumTicks: 160,
        style: "slash",
        defaults: { widen: false, ai: { maxChase: 4 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(tripleaxelId, "reach", pokemon), geometry: "cone", style: "slash", color: 0xBFE7F2,
                label: config && config.widen === true ? "横扫三旋击" : "收势三旋击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[tripleaxelId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(tripleaxelId, "tempo", context)),
                recover: Math.round(p(tripleaxelId, "recover", context)),
                cooldown: Math.round(p(tripleaxelId, "recharge", context)),
                active: skills[tripleaxelId].active,
                range: p(tripleaxelId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_tripleaxel:windup", tripleaxelScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", widen: config && config.widen === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            if (body === null || target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const kick = p(tripleaxelId, "kick", action);
            const kicks = Math.max(1, Math.round(p(tripleaxelId, "kicks", action)));
            const ramp = p(tripleaxelId, "ramp", action);
            const arc = p(tripleaxelId, "arc", action);
            const reach = p(tripleaxelId, "reach", action);
            const gap = Math.max(2, Math.round(p(tripleaxelId, "gap", action)));
            const accuracy = p(tripleaxelId, "accuracy", action);
            const sparks = Math.max(6, Math.round(p(tripleaxelId, "sparks", action)));
            const scale = Math.max(0.6, Math.min(2.4, reach / 2.8));
            const up = WorldCombat.point(0, 1.1, 0);
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function step(current: CombatAction): void {
                if (settled) return;
                const scope = current.world();
                const selfBody = scope.observe(current.actor());
                const victim = scope.actor(targetRef);
                const victimBody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (selfBody === null || victimBody === null) { finish(current); return; }
                if (index >= kicks) { finish(current); return; }
                const origin = selfBody.position();
                current.face(victimBody.position(), 22, 22);
                let heading = victimBody.position().minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                const power = kick * (1 + ramp * index);
                const intensity = Math.max(0.6, Math.min(2.4, power / 14));
                const fan = tripleaxelFan(origin, heading, reach, arc);

                if (scope.random() >= accuracy) {
                    WorldFeedback.emit(scope, tripleaxelScene, 1, origin,
                        { moment: "whiff", path: fan, index: index, kicks: kicks, arc: arc, scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(up), tripleaxelMissText, [index + 1], 24);
                    finish(current);
                    return;
                }

                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, heading, reach, arc, { below: 1.2, above: 2.2 }),
                    function (victimActor, facts) {
                        if (hurt(current, victimActor, tripleaxelId, power, { damage: damageSpec(tripleaxelId, "kick"), contact: true })) {
                            hits++;
                            WorldFeedback.emit(scope, tripleaxelScene, 1, facts.position(),
                                { moment: "hit", target: String(victimActor.ref()), index: index, kicks: kicks, arc: arc,
                                    power: Math.round(power * 10) / 10, sparks: sparks, scale: scale, intensity: intensity }, 20);
                        }
                    });
                WorldFeedback.emit(scope, tripleaxelScene, 1, origin,
                    { moment: "kick", path: fan, index: index, kicks: kicks, arc: arc, power: Math.round(power * 10) / 10,
                        direction: [heading.x(), heading.y(), heading.z()], sparks: sparks, scale: scale, intensity: intensity }, 18);
                sound(current, "cobblemon:impact.ice");
                if (hits === 0) {
                    WorldFeedback.text(scope, origin.plus(up), tripleaxelMissText, [index + 1], 24);
                    finish(current);
                    return;
                }
                WorldFeedback.text(scope, origin.plus(up), tripleaxelRiseText, [index + 1, Math.round(power)], 22);
                index++;
                if (index >= kicks) { finish(current); return; }
                current.after(gap, step);
            }

            sound(action, "minecraft:entity.player.attack.weak");
            step(action);
        }
    });
}
