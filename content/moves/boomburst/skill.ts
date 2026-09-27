/** Expanding sound impact and knockback; its brief visual afterglow does not create a status. */
namespace PokemonSkills {
    const boomburstScene = "world_combat:move_boomburst";
    const boomburstHitText = "world_combat.move.boomburst.text.hit";
    const boomburstMissText = "world_combat.move.boomburst.text.miss";

    define({
        id: "boomburst",
        name: "Boomburst",
        description: "蓄力后向周围爆发声波，伤害并推开附近敌人。越靠近中心，伤害和推力越强。爆压式收窄范围，换取更重的冲击。",
        uses: ["被围住时一次把一圈人轰开", "把贴身的追击者吹离原位", "对空中与地面一视同仁的整圈扫场", "用一次高威力换取一段长起手"],
        kind: "self",
        range: 4.8,
        maxRange: 7.6,
        prepare: 18,
        active: 0,
        recover: 12,
        cooldown: 44,
        style: "shockwave",
        defaults: { concussive: false, ai: { maxChase: 9, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("boomburst", "blastRadius", pokemon), geometry: "area", style: "shockwave",
                color: 0xD8D8E8, label: config && config.concussive === true ? "爆压式" : "扩散式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["boomburst"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const concussive = !!(config && config.concussive);
            return {
                prepare: Math.round(p("boomburst", "prepare", context) + (concussive ? 3 : 0)),
                recover: Math.round(p("boomburst", "recover", context)),
                cooldown: Math.round(p("boomburst", "cooldown", context) + (concussive ? 8 : -2)),
                active: skills["boomburst"].active,
                range: p("boomburst", "blastRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("boomburst:charge", boomburstScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", area: p("boomburst", "blastRadius", action),
                    concussive: config && config.concussive === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(3.0, p("boomburst", "blastRadius", action));
            const power = p("boomburst", "blast", action);
            const falloff = Math.max(0.4, Math.min(0.8, p("boomburst", "falloff", action)));
            const shock = p("boomburst", "shock", action);
            const rings = Math.max(6, Math.round(p("boomburst", "rings", action)));
            const cap = Math.max(1, Math.round(p("boomburst", "maxTargets", action)));
            const scale = radius / 4.8;
            let dealt = 0;

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 3.5, above: 4 }), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(actor.ref()) || dealt >= cap) return;
                const distance = facts.position().minus(centre).length();
                const reach = radius <= 0 ? 0 : Math.min(1, distance / radius);
                const strength = 1 - (1 - falloff) * reach;
                if (!hurt(action, enemy, "boomburst", power * strength, { damage: damageSpec("boomburst", "blast"), sound: true })) return;
                dealt++;
                const away = facts.position().minus(centre);
                let flung = false;
                if (world.valid(enemy) && away.length() > 0.2) {
                    const direction = WorldCombat.point(away.x(), 0, away.z()).unit();
                    const pushed = world.hitDisplace(enemy, direction.scale(shock * strength));
                    const lifted = world.hitImpulse(enemy, WorldCombat.point(0, shock * 0.35 * strength, 0));
                    flung = pushed > 0 || lifted;
                }
                WorldFeedback.emit(world, boomburstScene, 1, facts.position(),
                    { moment: "hit", target: ref, scale: scale, strength: strength, count: Math.round(12 + power * strength * 0.22),
                        flung: flung ? 1 : 0, fling: flung ? Math.round(10 + power * strength * 0.1) : 0,
                        intensity: Math.max(0.5, Math.min(2.2, power * strength / 110)) }, 26);
            });

            WorldFeedback.emit(world, boomburstScene, 1, centre,
                { moment: "burst", radius: radius, scale: scale, rings: rings, flow: Math.round(70 + radius * 28),
                    cells: Math.round(20 + radius * 6), marks: Math.round(16 + power * 0.24),
                    intensity: Math.max(0.7, Math.min(2.4, power / 110)) }, 30);
            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.keep(world, "boomburst:ringing:" + String(actor.ref()), boomburstScene, 1, centre,
                { moment: "ringing", radius: radius, flow: Math.round(30 + radius * 16), rings: rings }, 40);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                dealt > 0 ? boomburstHitText : boomburstMissText, dealt > 0 ? [dealt] : [], 26);
            if (dealt === 0)
                WorldFeedback.emit(world, boomburstScene, 1, centre, { moment: "miss" }, 22);
            done(action);
        }
    });

}
