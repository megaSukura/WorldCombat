/**
 * 弹跳 / bounce —— 世界内的动作。
 *
 * 核心念头：把地面当弹簧，原地弹成一道紧凑的抛物线——蹲身压地、笔直弹起、最高点短暂悬停一下
 * （贴地近战够不着），再从最高点沿落点斜坠砸下，把弹跳的劲灌进目标，有机会把它麻住。
 *
 * 三幕（提交后由本招自己驱动）：
 *   起（提交前 windup）：蹲身压地预告，可免费打断、不花 PP。
 *   弹（execute 前半）：直上高空、短暂悬停；悬停期间身上挂着真实的 `world_combat:bounce_airborne`
 *       （共享身份 world_combat:status/bounce），落地后结束。落点在起跳那一刻就锁死，不再重新瞄准。
 *   落（execute 后半）：沿落点斜坠下砸；落点半径内的敌人各挨一记接触伤害，被向下压、向后推，
 *       并按概率陷入麻痹。起跳那一刻头顶的净空决定实际高度，这一击随之变轻或变重。
 *
 * 瞄准：`kind: "aim"`——可以点敌人，也可以直接朝脚下的地面点发力。没有实体时用世界点落位，
 * 把瞄点投到地面并按这一跳的最大水平距离收口，不会把落点甩到远处；空放照常起跳、悬停、落地。
 * 表现与判定读同一份锁定落点与同一份实际高度。
 *
 * 与同族的飞翔分开：飞翔是「爬上高空、横掠战场、竖直俯冲」，弹跳是「原地竖直弹起、沿落点斜坠」，
 * 没有滑翔、没有重新锁定，靠压缩/回弹的地面环与落地电劲读出来。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）与位移（world.displace）
 * 都走同一条路；只有属性相性/本系是宝可梦层。
 */
namespace PokemonSkills {
    /** 高度系数下限：天花板压顶时这一击也有全高的六成多。 */
    const BOUNCE_LOW_POWER = 0.62;

    define({
        freeMovement: true,
        id: bounceId,
        cooldownParameter: "recharge", name: "弹跳",
        description: "蹲身压地后笔直弹起、短暂悬停在最高点，再沿落点斜坠砸下：落点范围内的敌人受到接触伤害并被向下压、向后推，有机会被落地那一下麻住。可以点敌人，也可以直接朝地面点发力——瞄点会投到地面并收在这一跳的距离内，空放照常起跳落下。起跳时头顶的净空决定能弹多高——开阔处弹满、一击最重，屋檐或洞穴压顶时只能低跳，威力缩水。",
        uses: ["跳过近战火力，从上方砸下来", "落地带麻痹，打断对手的节奏", "在有掩体前抢一个高空落点", "直接朝脚下或前方地面点发力空放"],
        kind: "aim", range: 5, maxRange: 7, prepare: 6, active: 60, recover: 7, cooldown: 30,
        style: "leap", stationary: true, maximumTicks: 200,
        defaults: { crush: false, ai: { maxChase: 9, escapeBelow: 0.55, leaveStation: false } },
        fields: [field(pathOf("crush"), "重落式", "boolean", {
            help: "开启（重落式）：弹得低、悬停短、落点收窄，但落地威力 ×1.18、判定半径 ×1.2、麻痹概率 ×1.15，收招与冷却更长，适合贴着目标一记下砸；关闭（弹起式）：弹得更高、悬停更久、落点更远，安全但这一击更轻。"
        })],
        indicator: function (config) {
            return { radius: 1.4, geometry: "circle", style: "leap", color: 0xFFD86A,
                label: config && config.crush === true ? "弹跳 · 重落" : "弹跳 · 弹起" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[bounceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(bounceId, "tempo", context)),
                recover: Math.round(p(bounceId, "settle", context)),
                cooldown: Math.round(p(bounceId, "recharge", context)),
                active: skills[bounceId].active,
                range: Math.min(skills[bounceId].maxRange!, p(bounceId, "hopDistance", context) + 1.0)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const climb = p(bounceId, "hopHeight", action);
            action.present("bounce-crouch", bounceScene, 1, body ? body.position() : action.origin(),
                JSON.stringify({ moment: "crouch", climb: climb, crush: config && config.crush === true ? 1 : 0,
                    source: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(bounceScene);
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { movementScenes.finish(action, done); return; }
            const target = action.target();
            const lockedBody = target !== null && world.observe(target) !== null ? world.observe(target) : null;
            const start = body.position();
            // 落点在起跳那一刻锁死：点实体就锚在它脚下，点世界点就投到那片地面。
            const aimPoint = action.targetPosition();
            const rawLock = lockedBody !== null ? lockedBody.position() : aimPoint;
            const groundLock = lockedBody !== null
                ? WorldCombat.point(rawLock.x(), rawLock.y() - lockedBody.height() * 0.5, rawLock.z())
                : WorldGeometry.ground(world, rawLock);
            // 水平引线收在这一跳的最大距离内，不会把落点甩到画面外。
            const lead = WorldCombat.point(groundLock.x() - start.x(), 0, groundLock.z() - start.z());
            const maxLead = Math.max(0.5, p(bounceId, "hopDistance", action));
            const lockGround = lead.length() <= maxLead || lead.length() < 1e-6 ? groundLock
                : WorldCombat.point(start.x() + lead.unit().x() * maxLead, groundLock.y(), start.z() + lead.unit().z() * maxLead);
            // 坠落终点取落点上方一点（有实体时取其身体中心），标记仍画在地面的 lockGround。
            const lock = WorldCombat.point(lockGround.x(), lockedBody !== null ? rawLock.y() : lockGround.y() + 0.9, lockGround.z());
            const maxHeight = p(bounceId, "hopHeight", action);
            const height = Math.max(0, Math.min(maxHeight, bounceHeadroom(world, body, maxHeight)));
            const heightFactor = BOUNCE_LOW_POWER + (1 - BOUNCE_LOW_POWER) * (height / Math.max(0.5, maxHeight));
            const climbSpeed = Math.max(0.15, p(bounceId, "riseSpeed", action));
            const fallSpeed = Math.max(0.3, p(bounceId, "fallSpeed", action));
            const hangTicks = Math.max(2, Math.round(p(bounceId, "hangTicks", action)));
            const radius = p(bounceId, "impactRadius", action);
            const power = p(bounceId, "leap", action) * heightFactor;
            const press = p(bounceId, "press", action);
            const push = p(bounceId, "push", action);
            const chance = Math.max(0, Math.min(1, p(bounceId, "paralyzeChance", action)));
            const paralyzeTicks = Math.max(20, Math.round(p(bounceId, "paralyzeTicks", action)));
            const maxTargets = Math.round(p(bounceId, "maxTargets", action));
            const scale = radius / bounceReferenceRadius;
            let apexY = start.y() + height;
            const riseTicks = Math.max(1, Math.ceil(height / climbSpeed));
            let finished = false;

            function finish(current: CombatAction): void {
                if (finished) return;
                finished = true;
                MobEffects.consume(current.world(), actor, bounceAirborne);
                movementScenes.finish(current, done);
            }
            function land(current: CombatAction, at: CombatPoint, blocked: boolean): void {
                movementScenes.stop(current);
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                const from = self.position(), heading = at.minus(from);
                const direction = heading.length() < 0.01 ? current.direction() : heading.unit();
                let hits = 0, paralyzed = 0;
                const actors = live.query(at, radius, false);
                for (let index = 0; index < actors.length && hits < maxTargets; index++) {
                    const other = actors[index];
                    if (String(other.ref()) === String(actor.ref()) || live.friendly(other)) continue;
                    const observed = live.observe(other);
                    if (observed === null || observed.position().minus(at).length() > radius || !live.clear(at, observed.position())) continue;
                    const gap = observed.position().minus(at).length();
                    const wasNumb = CombatStatus.has(live, other, "paralysis");
                    const dealt = hurt(current, other, bounceId, power * Math.max(0.6, 1 - gap / radius * 0.4),
                        { damage: damageSpec(bounceId, "leap"), contact: true });
                    if (!dealt) continue;
                    if (live.valid(other)) live.hitDisplace(other, WorldCombat.point(direction.x() * push, -press, direction.z() * push));
                    if (!wasNumb && chance > 0 && live.random() < chance
                        && CombatStatus.inflict(live, other, "paralysis", paralyzeTicks, 0, { secondary: true })) paralyzed++;
                    hits++;
                }
                WorldFeedback.emit(live, bounceScene, 1, at, { moment: hits > 0 ? "impact" : "whiff",
                    scale: scale, intensity: 1 + Math.min(1.4, hits * 0.4 + paralyzed * 0.3),
                    climb: height, height: Math.round(heightFactor * 100) / 100, paralyzed: paralyzed, hits: hits,
                    sparks: paralyzed * 12 }, 40);
                WorldFeedback.emit(live, bounceScene, 1, self.position(), { moment: "rebound", scale: scale,
                    intensity: 1 + Math.min(0.8, hits * 0.2) }, 24);
                if (paralyzed > 0) WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.15, 0)), bounceParalyzeText, [paralyzed], 44);
                else WorldFeedback.text(live, at.plus(WorldCombat.point(0, 1.1, 0)), hits > 0 ? bounceLandText : bounceWhiffText, hits > 0 ? [hits] : [], 30);
                live.sound(paralyzed > 0 ? "cobblemon:move.thunderwave.target" : "minecraft:entity.slime.attack", at, 16, "{}");
                finish(current);
            }
            function fall(current: CombatAction): void {
                movementScenes.stop(current, "rise");
                movementScenes.stop(current, "hang");
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                const from = self.position(), toward = lock.minus(from), remaining = toward.length();
                if (remaining <= 0.35) { land(current, from, false); return; }
                const direction = toward.unit(), step = Math.min(fallSpeed, remaining), delta = direction.scale(step);
                const swept = sweepStep(current, delta, Math.max(0.4, radius * 0.6)), hit = swept.hit;
                const victim = hit.target();
                if (hit.hitEntity() && victim !== null && !current.sense().friendly(victim)) { land(current, hit.position(), false); return; }
                if (hit.blocked()) { land(current, current.origin(), true); return; }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? live.displace(actor, swept.remaining) : 0);
                if (moved < Math.min(p(bounceId, "minimumMove", current), step * 0.4)) { land(current, current.origin(), true); return; }
                current.after(1, function (next) { fall(next); });
            }
            function hang(current: CombatAction, elapsed: number): void {
                movementScenes.stop(current, "rise");
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                if (elapsed >= hangTicks) {
                    movementScenes.show(current, "fall", self.position(), { moment: "fall", climb: height, scale: scale });
                    fall(current);
                    return;
                }
                const position = self.position();
                live.displace(actor, WorldCombat.point(0, Math.max(-0.4, Math.min(0.4, apexY - position.y())), 0));
                movementScenes.show(current, "hang", position, { moment: "hang", climb: height, scale: scale });
                WorldFeedback.keep(live, "bounce:mark", bounceScene, 1, lockGround,
                    { moment: "mark", climb: height, scale: scale }, 8);
                current.after(1, function (next) { hang(next, elapsed + 1); });
            }
            function rise(current: CombatAction, step: number): void {
                const live = current.world(), self = live.observe(actor);
                if (self === null) { finish(current); return; }
                if (step >= riseTicks || self.position().y() >= apexY - 0.05) { hang(current, 0); return; }
                const move = Math.min(climbSpeed, apexY - self.position().y());
                if (live.displace(actor, WorldCombat.point(0, move, 0)) < move * 0.5) { apexY = self.position().y() + move; hang(current, 0); return; }
                current.after(1, function (next) { rise(next, step + 1); });
            }

            sound(action, "minecraft:entity.goat.long_jump");
            movementScenes.show(action, "rise", start, { moment: "rise", climb: height });
            MobEffects.apply(world, actor, bounceAirborne, riseTicks + hangTicks + 50, 0);
            rise(action, 0);
        }
    });
}
