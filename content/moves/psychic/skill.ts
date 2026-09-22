/**
 * 精神强念 / psychic —— 注册与动作。
 *
 * 核心念头：一记**抓住并挤压**的念力重手。先在目标身上收拢念力、把它按在原地并朝自己拖一段，
 * 片刻后再狠狠一挤。它是本组最重、最慢、最贵的一发，身份是「握」。
 *
 * 两幕：
 *   起（windup，提交前）：施法者身前念力内收，目标身上亮起锁定环，只播预告。
 *   握（grip → squeeze，提交后）：提交瞬间在射程内抓住目标——结算 grip 伤害、挂共享 `world_combat:rooted`
 *       定住它、朝施法者拖 drag 格（按目标体型折减抵抗）、按概率把特防压 1 级；隔 squeezeDelay 刻后，
 *       若目标仍被同一只握按住，再落一记 squeeze 挤压；握被外力解除或目标离场则不再挤。
 *
 * 与同族分开：念力是又快又便宜的骚扰弹，精神强念是慢而可读的控制重击（抓住、定住、拽动、压特防）。
 * 配置 `hold`（缠握）由 resolve 改时序、由公式改定身／拖拽／挤压／概率。
 */
namespace PokemonSkills {
    /** 目标身上是否带着本只握（来源是施法者）的定身；决定第二下挤压落不落。 */
    function psychicRooted(world: CombatWorld, target: CombatActor, actor: CombatActor): boolean {
        const rooted = world.effects(target, "world_combat:rooted");
        for (let index = 0; index < rooted.length; index++)
            if (String(rooted[index].source().ref()) === String(actor.ref())) return true;
        return false;
    }

    define({
        id: psychicId,
        name: "Psychic",
        description: "用念力抓住目标：定住它并把它朝自己拖近一段，抓取时造成一次特殊伤害并可能让特防下降 1 级；片刻后若仍握得住，再挤一记。缠握式握得更久更重，点握式更远更快。",
        uses: ["中远距离点名一个高威胁目标", "把冲上来的敌人按在原地", "把目标从队友面前拽开"],
        kind: "enemy",
        range: 12,
        maxRange: 16,
        prepare: 14,
        active: 0,
        recover: 9,
        cooldown: 40,
        style: "psychic",
        defaults: { hold: false, ai: { maxChase: 15, fresh: true, focusThreat: true } },
        fields: [flag("hold", "缠握")],
        indicator: function (config, pokemon) {
            return { radius: p(psychicId, "reach", pokemon), geometry: "area", style: "psychic", color: 0x7A52E6,
                label: config && config.hold === true ? "精神强念·缠握" : "精神强念" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[psychicId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(psychicId, "tempo", context)),
                recover: Math.round(p(psychicId, "aftercast", context)),
                cooldown: Math.round(p(psychicId, "recharge", context)),
                active: 0,
                range: p(psychicId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:psychic:windup", psychicScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", hold: config && config.hold === true }));
            action.present("world_combat:psychic:lock", psychicScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "lock", target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const gripPower = p(psychicId, "grip", action);
            const squeezePower = p(psychicId, "squeeze", action);
            const drag = p(psychicId, "drag", action);
            const gripTicks = Math.max(20, Math.round(p(psychicId, "gripTicks", action)));
            const chance = Math.max(0.02, Math.min(0.9, p(psychicId, "sunderChance", action)));
            const stages = Math.max(1, Math.round(p(psychicId, "sunderStages", action)));
            const delay = Math.max(3, Math.round(p(psychicId, "squeezeDelay", action)));
            const spirals = Math.max(10, Math.round(p(psychicId, "spirals", action)));
            const intensity = Math.max(0.6, Math.min(2.4, gripPower / 92));
            const scale = Math.max(0.6, Math.min(2.2, gripPower / 92));
            let settled = false;

            sound(action, "cobblemon:move.psychic.actor");
            if (target === null || !world.valid(target) || world.friendly(target)) { done(action); return; }
            const victim: CombatActor = target;
            const body = world.observe(victim);
            if (body === null) { done(action); return; }
            const at = body.position();

            function squeeze(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (scope.valid(victim) && !scope.friendly(victim) && psychicRooted(scope, victim, actor)) {
                    const held = scope.observe(victim);
                    if (held !== null) {
                        const landed = hurt(current, victim, psychicId, squeezePower, { damage: damageSpec(psychicId, "squeeze") });
                        WorldFeedback.emit(scope, psychicScene, 1, held.position(),
                            { moment: "squeeze", target: String(victim.ref()), spirals: spirals, scale: scale, intensity: intensity }, 28);
                        if (landed) {
                            sound(current, "cobblemon:impact.psychic");
                            WorldFeedback.text(scope, held.position().plus(WorldCombat.point(0, 1.2, 0)), psychicSqueezeText, [], 24);
                        }
                    }
                }
                done(current);
            }

            const landed = hurt(action, victim, psychicId, gripPower, { damage: damageSpec(psychicId, "grip") });
            if (!landed) {
                WorldFeedback.emit(world, psychicScene, 1, at, { moment: "miss", target: String(victim.ref()) }, 22);
                done(action);
                return;
            }
            if (world.valid(victim)) WorldEffects.apply(world, victim, "rooted", {}, gripTicks);
            // 拖拽：朝施法者方向拉，按目标身高折减抵抗（大个子更难拽动），最多拉到贴身前一点。
            const self = world.observe(actor);
            let pull = 0;
            if (self !== null && world.valid(victim)) {
                const delta = at.minus(self.position());
                const flat = WorldCombat.point(delta.x(), 0, delta.z());
                const distance = flat.length();
                const resistance = Math.max(0.5, Math.min(1.3, 1.4 / Math.max(0.4, body.height())));
                pull = Math.min(drag * resistance, Math.max(0, distance - 1.2));
                if (distance > 0.05 && pull > 0.05) world.displace(victim, flat.unit().scale(-pull));
            }
            WorldFeedback.emit(world, psychicScene, 1, at,
                { moment: "grip", target: String(victim.ref()), spirals: spirals, scale: scale, intensity: intensity, pull: pull }, 30);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), psychicGripText, [], 26);
            if (world.valid(victim) && world.random() < chance) {
                NativeEffects.boost(world, victim, "spd", -stages);
                const marked = world.observe(victim);
                if (marked !== null) {
                    WorldFeedback.emit(world, psychicScene, 1, marked.position(), { moment: "sunder", target: String(victim.ref()), spirals: spirals }, 24);
                    WorldFeedback.text(world, marked.position().plus(WorldCombat.point(0, 1.4, 0)), psychicSunderText, [stages], 28);
                }
            }
            action.after(delay, squeeze);
        }
    });
}
