/** A stationary celebration pays once per confirmed hostile death and team; its carrier owns the field visual. */
namespace PokemonSkills {
    const happyhourScene = "world_combat:move_happyhour";
    const happyhourBanner = "world_combat:happyhour_banner";
    const happyhourField = "world_combat:field/happyhour";
    const happyhourEarnText = "world_combat.move.happyhour.text.earn";
    const happyhourRaiseText = "world_combat.move.happyhour.text.raise";

    /** 在一点落下一捧真币：优先 Cobblemon 遗迹硬币，缺失时退回金粒；带初速自然落地。 */
    function happyhourPayout(world: CombatWorld, point: CombatPoint, coins: number): number {
        const item = world.item("cobblemon:relic_coin") !== null ? "cobblemon:relic_coin" : "minecraft:gold_nugget";
        const count = Math.max(1, Math.round(coins));
        let actual = 0;
        for (let index = 0; index < count; index++) {
            const angle = world.random() * Math.PI * 2, speed = 0.15 * (0.6 + world.random() * 0.8);
            const drop = WorldCombat.point(Math.cos(angle) * 0.4, 0.4 + world.random() * 0.3, Math.sin(angle) * 0.4);
            const itemRef = world.dropItem(point.plus(drop), item, 1,
                JSON.stringify({ pickupDelay: 16, velocity: [Math.cos(angle) * speed, 0.22, Math.sin(angle) * speed] }));
            if (itemRef) actual++;
        }
        if (!actual) return 0;
        WorldFeedback.emit(world, happyhourScene, 1, point, { moment: "payout", coins: actual }, 30);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), happyhourEarnText, [actual], 32);
        world.sound("cobblemon:block.relic_coin_pouch.place", point, 16, "{}");
        return actual;
    }

    WorldEffects.fieldRule(happyhourField, {
        scan: function (effect, world, field) {
            if (!MobEffects.matches(world, effect.source(), field.data.anchor)) { effect.end(); return; }
            if (!field.data.lease) field.data.lease = MobEffects.bind(world, effect.source(), happyhourBanner);
            if (!MobEffects.present(world, field.data.lease)) { effect.end(); return; }
            const centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            WorldFeedback.onEffect(world, effect.id(), "celebration", happyhourScene, 1, centre,
                { moment: "hold", radius: field.radius, motes: field.data.motes, scale: field.radius / 4.5 });
        }
    });
    function happyhourCovers(zone: WorldEffects.Area, data: CombatNativeDeathFacts): boolean {
        if (zone.pending || data.tick < zone.data.born) return false;
        const dx = zone.position[0] - data.position[0], dy = zone.position[1] - data.position[1], dz = zone.position[2] - data.position[2];
        return dx * dx + dy * dy + dz * dz <= zone.radius * zone.radius;
    }
    WorldCombat.on("world_combat:move_happyhour/payout", "world_combat:actor_died", "", event => {
        const data: CombatNativeDeathFacts = JSON.parse(String(event.data())), world = event.world();
        if (data.friendly || data.self) return;
        const zones = WorldEffects.areas(world, happyhourField).filter(zone => {
            const owner = world.actor(zone.source);
            return happyhourCovers(zone, data) && owner !== null && world.valid(owner) && world.friendly(owner)
                && MobEffects.matches(world, owner, zone.data.anchor);
        }).sort((a, b) => a.id - b.id);
        if (!zones.length || zones[0].source !== String(event.actor().ref())) return;
        // The oldest covering allied field is the single payee. Mark every overlap before dropping, including a failed native drop.
        if (zones.some(zone => zone.data.paid && zone.data.paid[data.deathId])) return;
        zones.forEach(zone => {
            const paid = zone.data.paid || {}; paid[data.deathId] = true;
            WorldEffects.update(world, zone.id, { data: { paid: paid } });
        });
        const winner = zones[0], point = WorldCombat.point(data.position[0], data.position[1], data.position[2]);
        const actual = happyhourPayout(world, point, Number(winner.data.purse));
        WorldEffects.update(world, winner.id, { data: { rewarded: (Number(winner.data.rewarded) || 0) + actual } });
    });

    define({
        id: "happyhour",
        cooldownParameter: "recharge",
        name: "Happy Hour",
        description: "当场摆开一场小型庆典，在自己脚下铺出一圈金色时光；在这段时光里，圈内真实倒下的非友方留下额外的 Relic Coin，同队重叠庆典只结算一份。",
        uses: ["在一场硬仗开打前先铺好，把战果做成丰收", "守住一块要地，让倒在这里的对手都留下买路钱", "给队伍的长时间缠斗补一份场上收入"],
        kind: "self",
        range: 0,
        maxRange: 0,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 70,
        style: "gold",
        stationary: true,
        defaults: { lavish: false, ai: { maxChase: 12, minFoes: 1, leaveStation: false } },
        fields: [flag("lavish", "铺张")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["happyhour"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("happyhour", "tempo", context)),
                recover: Math.round(p("happyhour", "aftercast", context)),
                cooldown: Math.round(p("happyhour", "recharge", context)),
                active: 0,
                range: 0
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            return MobEffects.read(world, self, happyhourBanner) !== null ? "already-celebrating" : "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_happyhour:raise", happyhourScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", lavish: config && config.lavish === true }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["happyhour"], detail: { values: config } };
            return { radius: p("happyhour", "radius", context), geometry: "circle", style: "gold", color: 0xFFD24A,
                label: config && config.lavish === true ? "欢乐时光·铺张" : "欢乐时光" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const ticks = Math.max(180, Math.round(p("happyhour", "banner", action)));
            const radius = Math.max(3.5, p("happyhour", "radius", action));
            const coins = Math.max(3, Math.round(p("happyhour", "purse", action)));
            const motes = Math.max(14, Math.round(p("happyhour", "motes", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 4.5));
            const banner = MobEffects.apply(world, self, happyhourBanner, ticks, 0);
            if (banner === null) { done(action); return; }
            WorldEffects.field(world, happyhourField, origin, radius,
                { purse: coins, motes: motes, born: world.tick(), anchor: MobEffects.anchor(banner), paid: {}, rewarded: 0 }, ticks);
            sound(action, "minecraft:ui.toast.challenge_complete");
            WorldFeedback.emit(world, happyhourScene, 1, origin,
                { moment: "raise", radius: radius, motes: motes, purse: coins, scale: scale }, 50);
            WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.4, 0)), happyhourRaiseText,
                [Math.round(ticks / 20), coins], 46);
            sound(action, "cobblemon:block.relic_coin_pouch.place");
            done(action);
        }
    });
}
