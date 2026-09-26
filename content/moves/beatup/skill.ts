/**
 * 围攻 / beatup 的出手方式。
 *
 * 核心念头：一声招呼，身边真实站着的同伴从各自的位置各送来一道暗影，一只接一只地围殴目标。
 *   来的人越多，飞出的暗影越多；每一位同伴自己的物攻决定自己那道影的轻重。它卖的是「真实站位凑出的乱拳」。
 *
 * 三幕：
 *   起（muster，提交前）：低吼、脚下泛起召集的暗影，只播预告。
 *   集（gather，提交后）：按 `rally` 把在场的同伴叫齐，暗影在各自脚边成形。
 *   殴（volley）：按顺序，每位同伴轮到时复核存活与距离，从当前位置朝锁点发出一道有限直线暗影；
 *       暗影撞上第一个非友方活体才用 `impact` 结算 `mob` 暗属伤害（按该同伴自己的物攻相对领队缩放），
 *       撞上方块或一路走空就落空。一位没中不取消其他成员；目标移开或隔墙都会让那一下落空。
 *   散（scatter）：结束后暗影四散。
 *
 * 与同族分开：鼠数儿是施法者召来幻影伙伴、长度随机、追踪目标；攻击指令的手下是有生命、会追飞、能被清场的实体；
 *   围攻是**真实在场的同伴各从自己的位置发一道直线影**——段数由场上队伍决定，掩体与走位都会改变结果。
 * 提交前只观察、只 `present`；暗影与伤害都在提交后写。
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

    /** 每位参与者的识别色，让命中点的碎屑和出场那一下能看出是谁出的手。 */
    function beatupMemberColor(index: number): number {
        const palette = [0x6E5AA8, 0x9F86D6, 0x50427E, 0xB9A6E0, 0x7C63B8, 0x8A6BD0];
        return palette[index % palette.length];
    }

    define({
        id: "beatup",
        cooldownParameter: "recharge",
        name: "Beat Up",
        description: "一声招呼，身边在场的同伴各自从站位送出一道暗影，依次扑向锁定的位置：暗影撞上第一个非友方活体才结算，隔墙或目标移开都会让那一下落空。同伴越多落下的拳头越多，每一位同伴自己的物攻决定那一下的轻重。",
        uses: ["身边有同伴时一起压上，堆出多段暗属伤害", "在伙伴环伺时处决残血目标", "靠人数对单个厚实目标打出一串小伤害"],
        kind: "aim",
        range: 7,
        maxRange: 11,
        prepare: 8,
        active: 0,
        recover: 8,
        cooldown: 60,
        maximumTicks: 420,
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
            if (body === null) { done(action); return; }
            // 自由瞄准：锁定提交时的实体中心或世界点；之后每道影都飞向这个锁点，目标移开就打空。
            const locked = action.targetPosition();
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

            /** 一位同伴出手：复核它是否还在场、是否离领队太远，再从它的实际位置发一道有限直线影。 */
            function volley(current: CombatAction): void {
                const scope = current.world();
                if (index >= participants.length) {
                    const at = scope.observe(actor);
                    WorldFeedback.emit(scope, beatupScene, 1, at !== null ? at.position() : locked,
                        { moment: "scatter", count: hits, total: participants.length, scale: scale, motes: motes }, 24);
                    finish(current); return;
                }
                const slot = index++;
                const member = scope.actor(participants[slot]);
                const mbody = member !== null && scope.valid(member) ? scope.observe(member) : null;
                const leader = scope.observe(actor);
                if (member === null || mbody === null || mbody.health() <= 0 || leader === null ||
                    mbody.position().minus(leader.position()).length() > rally + 0.5) {
                    // 轮到自己前倒下、被移走或掉队：跳过它那一下，不假冲。
                    current.after(gap, volley); return;
                }
                const origin = mbody.position();
                let heading = locked.minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                const distance = heading.length(), direction = heading.unit();
                const power = beatupPower(scope, actor, member, base);
                const intensity = Math.max(0.6, Math.min(2.0, power / Math.max(1, base)));
                const color = beatupMemberColor(slot);
                const arrival = Math.max(2, Math.round(distance / Math.max(0.2, speed)));
                // 真正出力者身边先亮一下（成员识别色），影随后从它当前位置飞出。
                WorldFeedback.emit(scope, beatupScene, 1, origin,
                    { moment: "charge", member: String(member.ref()), color: color, index: slot + 1, total: participants.length,
                        motes: motes, scale: scale, intensity: intensity }, Math.max(8, Math.min(16, arrival + 4)));
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: "cobblemon:generic/impact/impact_dark", tint: color, glow: true, scale: scale
                };
                const flight = current.projectile(origin, direction.scale(speed), 0, radius, distance + 2, arrival + 20,
                    function (inner: CombatAction, hit: CombatImpact): void {
                        const hitWorld = inner.world();
                        const struck = hit.target();
                        let landed = false;
                        if (hit.hitEntity() && struck !== null && hitWorld.valid(struck) && !hitWorld.friendly(struck))
                            // 每位成员一个独立 strike：原生对「同一行动 + 同一 strike + 同一目标」只结算一次，
                            // 用槽位区分才能让整队真的各落一下。
                            landed = impact(inner, hit, "beatup", power, { damage: damageSpec("beatup", "mob") }, "beatup:" + slot);
                        if (landed) hits++;
                        WorldFeedback.emit(hitWorld, beatupScene, 1, hit.position(),
                            { moment: landed ? "hit" : "whiff", member: String(member!.ref()), color: color, index: slot + 1,
                                total: participants.length, motes: motes, scale: scale, intensity: intensity }, 20);
                        if (landed) {
                            WorldFeedback.text(hitWorld, hit.position().plus(WorldCombat.point(0, 0.8, 0)), beatupHitText, [slot + 1], 20);
                            sound(inner, "cobblemon:impact.dark");
                        }
                    },
                    function (inner: CombatAction): void { inner.after(gap, volley); }, JSON.stringify(appearance));
                WorldFeedback.keep(scope, "beatup:shadow:" + String(action.id()) + ":" + slot, beatupScene, 1, origin,
                    { moment: "rush", projectile: flight, member: String(member.ref()), color: color, count: slot + 1, total: participants.length,
                        direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity, motes: motes }, arrival + 30);
            }

            action.after(lull, volley);
        }
    });
}
