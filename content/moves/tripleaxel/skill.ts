/**
 * 三旋击 / tripleaxel 的出手方式。
 *
 * 核心念头：滑着身子旋踢三圈——第一脚轻、第二脚重、第三脚最重；每脚独立掷命中，落空这串就停。
 * 它的身份是「旋」：三脚之间身体沿释放方向的侧弧短滑步，每脚的前向来自滑步的真实切线，扫在身前一段扇形里；
 * 站得近的第二个对手也会被旋到。与三连踢的分别就在这里——三连踢是站定朝前的窄走廊直踢，三旋击是滑步旋身横扫。
 *
 * 三拍：
 *   起（windup，提交前）：屈膝压身，脚边冰屑开始打旋。
 *   旋（kick，提交后）：第一脚朝释放方向；命中后身体沿侧弧滑 `slide` 格、转过 `spin` 度（滑步受身体碰撞约束），
 *       下一脚就朝这段弧的真实切线。第 n 脚威力 = kick × (1 + ramp × 已踢脚数)。扇形里的每个非友方各吃一记，
 *       同一脚不重复结算。任一脚掷空、或扇形里没有敌人，这串就停；原目标倒下不会阻止已在扫弧内的其他敌人。
 *   收（whiff / done）：撞墙挡下滑步就在当前可挥范围收下一脚后终止；三脚踢满自然收势。
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
    /** 把水平朝向绕世界 Y 轴转 `degrees` 度，用于滑步切线。 */
    function tripleaxelRotate(direction: CombatPoint, degrees: number): CombatPoint {
        const angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, 0, direction.x() * sin + direction.z() * cos);
    }
    /** 起旋方向：优先当刻瞄准，其次动作选点，最后原方向。 */
    function tripleaxelHeading(action: CombatAction, origin: CombatPoint): CombatPoint {
        try {
            const parsed = JSON.parse(action.control());
            const samples = parsed && parsed.samples;
            if (samples && samples.length && samples[0].point && samples[0].point.length === 3) {
                const aimed = WorldCombat.point(samples[0].point[0], samples[0].point[1], samples[0].point[2]).minus(origin);
                const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
                if (flat.length() > 0.05) return flat.unit();
            }
        } catch (error) { }
        try {
            const aimed = action.targetPosition().minus(origin);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            if (flat.length() > 0.05) return flat.unit();
        } catch (error) { }
        const direction = action.direction();
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() > 1e-6 ? flat.unit() : WorldCombat.point(0, 0, 1);
    }

    define({
        freeMovement: true,
        id: tripleaxelId,
        cooldownParameter: "recharge",
        name: "Triple Axel",
        description: "滑着身子旋踢三圈：第一脚朝释放方向，命中后身体沿侧弧滑出一步，下一脚就朝这段弧的真实切线，逐脚更重（以第一脚威力为基准逐脚加档）。每一脚都扫在身前一段扇形里，同时扫到扇形里的所有敌人；每脚独立掷命中，落空这串就停。横扫式能把身旁的第二个人也卷进来。",
        uses: ["滑步旋身连踢三脚", "每中一脚，下一脚更重", "宽弧横扫照顾身旁的目标"],
        kind: "aim",
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
            if (body === null) { done(action); return; }
            const kick = p(tripleaxelId, "kick", action);
            const kicks = Math.max(1, Math.round(p(tripleaxelId, "kicks", action)));
            const ramp = p(tripleaxelId, "ramp", action);
            const arc = p(tripleaxelId, "arc", action);
            const reach = p(tripleaxelId, "reach", action);
            const slide = Math.max(0.4, p(tripleaxelId, "slide", action));
            const spin = p(tripleaxelId, "spin", action);
            const gap = Math.max(2, Math.round(p(tripleaxelId, "gap", action)));
            const accuracy = p(tripleaxelId, "accuracy", action);
            const sparks = Math.max(6, Math.round(p(tripleaxelId, "sparks", action)));
            const scale = Math.max(0.6, Math.min(2.4, reach / 2.8));
            const up = WorldCombat.point(0, 1.1, 0);
            const scenes = WorldFeedback.actionScenes(tripleaxelScene);
            let heading = tripleaxelHeading(action, body.position());
            let index = 0;
            let blockedSlide = false, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }
            function stepRadius(current: CombatAction): number {
                const selfBody = current.world().observe(actor);
                return selfBody === null ? 0.4 : Math.max(0.2, Math.min(1, selfBody.width() * 0.5));
            }

            /** 沿侧弧滑步：逐小段转向并前移，方向始终是这段弧的切线；受身体碰撞约束，撞墙即停。 */
            function slideStep(current: CombatAction, next: (current: CombatAction) => void): void {
                const parts = Math.max(2, Math.ceil(Math.abs(spin) / 6));
                const legLength = slide / parts;
                let remaining = slide;
                function sub(current: CombatAction, part: number): void {
                    if (settled) return;
                    if (part >= parts || remaining <= 0.01) { next(current); return; }
                    const scope = current.world();
                    const selfBody = scope.observe(actor);
                    if (selfBody === null) { finish(current); return; }
                    heading = tripleaxelRotate(heading, spin / parts);
                    const leg = Math.min(legLength, remaining);
                    const swept = sweepStep(current, heading.scale(leg), stepRadius(current));
                    const moved = swept.moved;
                    remaining -= moved;
                    const at = current.origin();
                    scenes.show(current, "slide", at, { moment: "slide", index: index, kicks: kicks, sparks: sparks,
                        scale: scale, slide: slide, spin: spin, direction: [heading.x(), heading.y(), heading.z()] });
                    current.face(at.plus(heading), 40, 40);
                    if (swept.hit.blocked() || (moved < leg * 0.5 && remaining > 0.01)) { blockedSlide = true; next(current); return; }
                    current.after(1, function (next2: CombatAction) { sub(next2, part + 1); });
                }
                sub(current, 0);
            }

            function kickStep(current: CombatAction): void {
                if (settled) return;
                if (index >= kicks) { finish(current); return; }
                const scope = current.world();
                const selfBody = scope.observe(actor);
                if (selfBody === null) { finish(current); return; }
                const origin = selfBody.position();
                const power = kick * (1 + ramp * index);
                const intensity = Math.max(0.6, Math.min(2.4, power / 14));
                const fan = tripleaxelFan(origin, heading, reach, arc);

                if (scope.random() >= accuracy) {
                    scenes.stop(current, "slide");
                    WorldFeedback.emit(scope, tripleaxelScene, 1, origin,
                        { moment: "whiff", path: fan, index: index, kicks: kicks, arc: arc, scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(up), tripleaxelMissText, [index + 1], 24);
                    finish(current);
                    return;
                }

                let hits = 0;
                const struck: { [ref: string]: boolean } = {};
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, heading, reach, arc, { below: 1.2, above: 2.2 }),
                    function (victimActor, facts) {
                        const ref = String(victimActor.ref());
                        if (struck[ref]) return;
                        struck[ref] = true;
                        if (hurt(current, victimActor, tripleaxelId, power, { damage: damageSpec(tripleaxelId, "kick"), contact: true })) {
                            hits++;
                            WorldFeedback.emit(scope, tripleaxelScene, 1, facts.position(),
                                { moment: "hit", target: ref, index: index, kicks: kicks, arc: arc,
                                    power: Math.round(power * 10) / 10, sparks: sparks, scale: scale, intensity: intensity }, 20);
                        }
                    });
                WorldFeedback.emit(scope, tripleaxelScene, 1, origin,
                    { moment: "kick", path: fan, index: index, kicks: kicks, arc: arc, power: Math.round(power * 10) / 10,
                        direction: [heading.x(), heading.y(), heading.z()], sparks: sparks, scale: scale, intensity: intensity }, 18);
                sound(current, "cobblemon:impact.ice");
                if (hits === 0) {
                    scenes.stop(current, "slide");
                    WorldFeedback.text(scope, origin.plus(up), tripleaxelMissText, [index + 1], 24);
                    finish(current);
                    return;
                }
                WorldFeedback.text(scope, origin.plus(up), tripleaxelRiseText, [index + 1, Math.round(power)], 22);
                index++;
                // 这一脚若来自被墙挡下的滑步，就在当前可挥范围收完它后终止，不再继续滑。
                if (index >= kicks || blockedSlide) { scenes.stop(current, "slide"); finish(current); return; }
                current.after(gap, function (next: CombatAction) { slideStep(next, kickStep); });
            }

            sound(action, "minecraft:entity.player.attack.weak");
            kickStep(action);
        }
    });
}
