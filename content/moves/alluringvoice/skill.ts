/** alluringvoice：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 本招自己的错乱载体：只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function alluringVoiceCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === alluringvoiceSong ? effect : null;
    }

    define({
        id: alluringvoiceId,
        cooldownParameter: "recharge", name: "魅诱之声",
        description: "先唱出一声短音、对声锥内的敌人结算一次伤害，隔一小段再拖出尾音：那一刻仍留在锥里、正在追击或带着强化的目标会被尾音惑乱，出手可能作废、打中别人还会反噬自己。可朝任意方向空唱，走出声锥就能躲掉尾音。",
        uses: ["惩罚刚强化过的对手，让它自乱阵脚", "一次扫过身前一条线上的敌人", "用尾音罩住正在追击的敌人", "朝空地空唱，逼对手绕开声锥"],
        kind: "aim", range: 7, maxRange: 11, prepare: 7, active: 1, recover: 8, cooldown: 34,
        style: "sound", stationary: true, maximumTicks: 120,
        defaults: { echo: false, ai: { maxChase: 13, minStages: 1, leaveStation: false } },
        fields: [field(pathOf("echo"), "回响式", "boolean", {
            help: "开启（回响式）：声场张角 ×1.35、长度 ×1.1、混乱时长 ×1.4、起手多 3 刻、冷却更长，但威力 ×0.85，适合一次罩住一圈人；关闭（直诉式）：张得更窄、唱得更重、更快，混乱更短，适合盯住一个目标。"
        })],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(alluringvoiceId, "reach", pokemon) : 7, geometry: "cone", style: "sound", color: 0xF2A0C8,
                label: config && config.echo === true ? "魅诱之声 · 回响" : "魅诱之声 · 直诉" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[alluringvoiceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(alluringvoiceId, "tempo", context)),
                recover: Math.round(p(alluringvoiceId, "settle", context)),
                cooldown: Math.round(p(alluringvoiceId, "recharge", context)),
                active: 1,
                range: p(alluringvoiceId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const reach = p(alluringvoiceId, "reach", action);
            const angle = p(alluringvoiceId, "angle", action);
            action.present("alluringvoice-charge", alluringvoiceScene, 1, body ? body.position() : action.origin(),
                JSON.stringify({ moment: "charge", reach: reach, angle: angle, echo: config && config.echo === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const origin = body.position(), targetPos = action.targetPosition();
            const delta = targetPos.minus(origin);
            // 方向提交时固定；两拍共用同一组顶点与同一片扇区，第二拍不再重新瞄准。
            const direction = delta.length() < 0.01 ? action.direction() : delta.unit();
            const reach = p(alluringvoiceId, "reach", action);
            const angle = p(alluringvoiceId, "angle", action);
            const power = p(alluringvoiceId, "voice", action);
            const baseTicks = Math.max(40, Math.round(p(alluringvoiceId, "confuseBase", action)));
            const perStage = Math.max(0, Math.round(p(alluringvoiceId, "confusePerStage", action)));
            const fumble = Math.max(0.05, Math.min(0.9, p(alluringvoiceId, "fumble", action)));
            const tailDelay = Math.max(4, Math.round(p(alluringvoiceId, "tailDelay", action)));
            const maxTargets = Math.round(p(alluringvoiceId, "maxTargets", action));
            const motes = Math.round(p(alluringvoiceId, "motes", action));
            const scale = reach / alluringvoiceReferenceReach;
            const vertices = alluringVoicePath(alluringVoiceFan(origin, direction, reach, angle));
            const fumblePct = Math.round(fumble * 100);
            const region = WorldGeometry.sector(origin, direction, reach, angle, { below: 2, above: 3 });
            let hits = 0, best = 0;

            sound(action, "cobblemon:move.sing.actor");
            // 首拍：短而实的一声，只结算一次原伤害，此刻不施混乱。
            WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                if (hits >= maxTargets) return;
                const boost = alluringVoiceBoost(world, victim);
                const dealt = hurt(action, victim, alluringvoiceId, power, { damage: damageSpec(alluringvoiceId, "voice"), sound: true });
                if (!dealt) return;
                hits++;
                if (boost > best) best = boost;
                WorldFeedback.emit(world, alluringvoiceScene, 1, facts.position(),
                    { moment: "hit", target: String(victim.ref()), stages: boost,
                        motes: Math.max(6, Math.round(motes / 2)), intensity: 1 + Math.min(1.2, boost * 0.12) }, 28);
            });
            WorldFeedback.emit(world, alluringvoiceScene, 1, origin,
                { moment: "wave", path: vertices, reach: reach, angle: angle, scale: scale, hits: hits,
                    stages: best, motes: motes, rise: 0.8 + Math.min(4, best * 0.35),
                    intensity: 1 + Math.min(1.6, best * 0.15 + hits * 0.2) }, 42);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.35, 0)), alluringvoiceStrikeText, [hits], 30);

            // 第二拍：拖长的尾音。只对那一刻仍留在同一片声锥里、且满足强化／追击条件的目标施混乱，不再补伤害。
            action.after(tailDelay, function (next) {
                const live = next.world();
                if (live.observe(actor) === null) { done(next); return; }
                const late = WorldGeometry.sector(origin, direction, reach, angle, { below: 2, above: 3 });
                let dazed = 0, bestLate = 0;
                WorldGeometry.selectEnemies(live, late, function (victim, facts) {
                    if (dazed >= maxTargets) return;
                    const boost = alluringVoiceBoost(live, victim);
                    if (boost <= 0) return;
                    const ticks = Math.max(60, baseTicks + boost * perStage);
                    if (!CombatStatus.apply(live, victim, "confusion", alluringvoiceSong, ticks, fumblePct, { unique: true })) return;
                    dazed++;
                    if (boost > bestLate) bestLate = boost;
                    WorldFeedback.keep(live, "alluringvoice:daze:" + String(victim.ref()), alluringvoiceScene, 1,
                        facts.position(), { moment: "daze", target: String(victim.ref()), stages: boost,
                            tick: Math.min(ticks, 220) }, Math.min(ticks, 200));
                });
                WorldFeedback.emit(live, alluringvoiceScene, 1, origin,
                    { moment: "tail", path: vertices, reach: reach, angle: angle, scale: scale, dazed: dazed,
                        stages: bestLate, motes: motes, rise: 0.8 + Math.min(4, bestLate * 0.35),
                        intensity: 1 + Math.min(1.2, bestLate * 0.12 + dazed * 0.2) }, 36);
                if (bestLate > 0) WorldFeedback.text(live, origin.plus(WorldCombat.point(0, 1.45, 0)), alluringvoiceDazeText, [bestLate], 36);
                live.sound(bestLate > 0 ? "cobblemon:status.volatile.confusion.actor" : "cobblemon:impact.fairy", origin, 16, "{}");
                done(next);
            });
        }
    });


    // 反噬：被惑乱的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_alluringvoice/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (alluringVoiceCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.spa || 0;
        const fraction = alluringvoiceRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, alluringvoiceScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), alluringvoiceRecoilText, [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 错乱存续期：飞鸟在头顶绕，低密度、每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_alluringvoice/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== alluringvoiceSong) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "alluringvoice:linger:" + String(actor.ref()), alluringvoiceScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
