/**
 * 围攻 / beatup 的出手方式。
 *
 * 核心念头：一声招呼，身边的同伴一起扑上去——每只同伴身上浮起一道暗影，一只接一只地围殴目标；
 *   来的人越多，落下的拳头越多，每一位同伴自己的物攻决定自己那一下的轻重。它卖的是「人多的那一阵乱拳」。
 *
 * 三幕：
 *   起（muster，提交前）：低吼、脚下泛起召集的暗影，只播预告。
 *   集（gather，提交后）：按 `rally` 把在场同伴叫齐，暗影在各自脚边成形。
 *   殴（volley）：按距离顺序，一位接一位地扑上去；每道暗影到位就结算一段 `mob` 暗属伤害，
 *       这一段的分量按该同伴自己的物攻相对领队缩放；间隔由 `gap` 决定，最多 `crowd` 段。
 *   散（scatter）：结束后暗影四散。
 *
 * 与同族分开：鼠数儿是施法者召来幻影伙伴、长度随机、每只可能扑空；围攻是**真实在场的同伴**依次出手，
 *   段数由场上队伍决定，每一位的份量由它自己的物攻决定。提交前只观察、只 `present`；暗影与伤害都在提交后写。
 */
namespace PokemonSkills {
    const beatupScene = "world_combat:move_beatup";
    const beatupMusterText = "world_combat.move.beatup.text.muster";
    const beatupHitText = "world_combat.move.beatup.text.hit";

    /** 参与者：自己 + `rally` 内最近的友方（存活、可见），上限 `crowd`。 */
    function beatupParticipants(world: CombatWorld, actor: CombatActor, centre: CombatPoint, rally: number, crowd: number): string[] {
        const self = String(actor.ref()), result: string[] = [self];
        const actors = world.query(centre, rally, false);
        for (let index = 0; index < actors.length && result.length < crowd; index++) {
            const other = actors[index], ref = String(other.ref());
            if (ref === self || result.indexOf(ref) >= 0) continue;
            if (!world.friendly(other)) continue;
            const body = world.observe(other);
            if (body === null || body.health() <= 0 || !body.visible()) continue;
            result.push(ref);
        }
        return result;
    }

    /** 某位参与者这一下的威力：领队那一下就是 `base`，同伴按自己物攻相对领队缩放。 */
    function beatupPower(world: CombatWorld, leader: CombatActor, member: CombatActor, base: number): number {
        if (String(leader.ref()) === String(member.ref())) return base;
        const mine = PokemonDamage.combatants.read(world, leader).stats["atk"] || 0;
        const theirs = PokemonDamage.combatants.read(world, member).stats["atk"] || 0;
        if (!(mine > 0) || !(theirs > 0)) return base;
        return base * Math.max(0.45, Math.min(1.8, theirs / mine));
    }

    define({
        id: "beatup",
        cooldownParameter: "recharge",
        name: "Beat Up",
        description: "一声招呼，身边在场的同伴一起扑上去围殴：每只同伴浮起一道暗影依次扑击，同伴越多落下的拳头越多，每一位同伴自己的物攻决定那一下的轻重。",
        uses: ["身边有同伴时一起压上，堆出多段暗属伤害", "在伙伴环伺时处决残血目标", "靠人数对单个厚实目标打出一串小伤害"],
        kind: "enemy",
        range: 7,
        maxRange: 11,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 60,
        maximumTicks: 320,
        style: "swarm",
        defaults: { widen: true, ai: { maxChase: 10, finishLow: true, minPack: 1, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("beatup", "rally", pokemon), geometry: "area", style: "swarm", color: 0x6E5AA8,
                label: config && config.widen === true ? "围攻·群起" : "围攻·精锐" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["beatup"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("beatup", "tempo", context)),
                recover: Math.round(p("beatup", "aftercast", context)),
                cooldown: Math.round(p("beatup", "recharge", context)),
                active: 0,
                range: p("beatup", "rally", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("beatup:muster", beatupScene, 1, action.origin(),
                JSON.stringify({ moment: "muster", widen: config && config.widen === true ? 1 : 0, scale: scale }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const target = action.target();
            if (body === null || target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const base = p("beatup", "mob", action);
            const rally = p("beatup", "rally", action);
            const crowd = Math.max(1, Math.min(6, Math.round(p("beatup", "crowd", action))));
            const gap = Math.max(2, Math.round(p("beatup", "gap", action)));
            const speed = p("beatup", "speed", action);
            const radius = p("beatup", "radius", action);
            const motes = Math.round(p("beatup", "motes", action));
            const lull = Math.max(2, Math.round(p("beatup", "lull", action)));
            const widen = !!(config && config.widen === true);
            const participants = beatupParticipants(world, actor, body.position(), rally, crowd);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.35));
            let index = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            WorldFeedback.emit(world, beatupScene, 1, body.position(),
                { moment: "gather", count: participants.length, total: crowd, scale: scale, widen: widen ? 1 : 0, motes: motes }, lull + 20);
            if (participants.length > 1) WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), beatupMusterText, [participants.length], lull + 20);
            sound(action, "minecraft:entity.player.attack.strong");

            function volley(current: CombatAction): void {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const vbody = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (vbody === null) { finish(current); return; }
                if (index >= participants.length) {
                    WorldFeedback.emit(scope, beatupScene, 1, vbody.position(),
                        { moment: "scatter", count: hits, total: participants.length, scale: scale, motes: motes }, 24);
                    finish(current); return;
                }
                const member = scope.actor(participants[index]);
                const mbody = member !== null && scope.valid(member) ? scope.observe(member) : null;
                if (member === null || mbody === null) { index++; current.after(1, volley); return; }
                const power = beatupPower(scope, actor, member, base);
                const intensity = Math.max(0.6, Math.min(2.0, power / Math.max(1, base)));
                const origin = mbody.position(), heading = vbody.position().minus(origin);
                const distance = heading.length();
                const direction = distance < 0.05 ? current.direction() : heading.unit();
                const arrival = Math.max(2, Math.round(distance / Math.max(0.2, speed)));
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: "cobblemon:generic/impact/impact_dark", tint: 0x6E5AA8, glow: true, scale: scale
                };
                const flight = current.projectile(origin, direction.scale(speed), 0, radius, distance + 2, arrival + 20,
                    function (): void { }, function (): void { }, JSON.stringify(appearance));
                WorldFeedback.keep(scope, "beatup:shadow:" + String(action.id()) + ":" + index, beatupScene, 1, origin,
                    { moment: "rush", projectile: flight, target: targetRef, count: index + 1, total: participants.length, member: String(member.ref()),
                        direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity, motes: motes }, arrival + 30);
                current.after(arrival, function (inner: CombatAction) {
                    const innerWorld = inner.world();
                    const struck = innerWorld.actor(targetRef);
                    const sbody = struck !== null && innerWorld.valid(struck) ? innerWorld.observe(struck) : null;
                    if (struck === null || sbody === null) { finish(inner); return; }
                    const landed = hurt(inner, struck, "beatup", power, { damage: damageSpec("beatup", "mob") });
                    if (landed) hits++;
                    WorldFeedback.emit(innerWorld, beatupScene, 1, sbody.position(),
                        { moment: landed ? "hit" : "whiff", target: targetRef, count: index + 1, total: participants.length,
                            member: String(member!.ref()), motes: motes, scale: scale, intensity: intensity }, 20);
                    if (landed) {
                        WorldFeedback.text(innerWorld, sbody.position().plus(WorldCombat.point(0, 1.1, 0)), beatupHitText, [index + 1], 20);
                        sound(inner, "cobblemon:impact.dark");
                    }
                    index++;
                    inner.after(gap, volley);
                });
            }

            action.after(lull, volley);
        }
    });
}
