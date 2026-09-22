/**
 * 欢乐时光 / happyhour —— 出手方式。
 *
 * 核心念头：当场摆开一场小型庆典，脚下铺出一圈还亮着的金色时光；在这段时光里，任何在圈内倒下的
 *   非友方都会当场爆出一捧本来要到战后才结算的 Relic Coin。它不攻击、不撒钱，只把战果变现。
 *
 * 两幕：
 *   起（windup，提交前）：头顶聚起翻涌的金光与星屑，预告这场庆典（`action.present`）。
 *   庆（raise → hold → payout）：提交后在自身脚下留下半径 `radius` 的金色场地（WorldEffects.field，
 *      规则 world_combat:field/happyhour 由本单元注册）并挂上共享身份 world_combat:status/happyhour 的光环，
 *      持续 `banner`；场地每 5 刻续一次金光。此后每次有非友方在这片场地里倒下，就当场落下 `purse` 枚真币
 *      （优先 cobblemon:relic_coin，缺失时退回金粒）；光环走完则场地一起收，钱归地上的人捡。
 *
 * 与同族分开：聚宝功当场撒钱换血、淘金潮倾库换伤害；只有欢乐时光是**先铺好一圈、再把之后每一场战果变现**的
 *   经营型庆典——它的收益不在施放的一刻，而在接下来倒下的每一个对手。
 * 反制：庆典有固定半径与时长，把对手拉出圈外、或拖到光环熄灭再打，就什么都收不到。
 */
namespace PokemonSkills {
    const happyhourScene = "world_combat:move_happyhour";
    const happyhourBanner = "world_combat:happyhour_banner";
    const happyhourField = "world_combat:field/happyhour";
    const happyhourEarnText = "world_combat.move.happyhour.text.earn";
    const happyhourRaiseText = "world_combat.move.happyhour.text.raise";

    /** 在一点落下一捧真币：优先 Cobblemon 遗迹硬币，缺失时退回金粒；带初速自然落地。 */
    function happyhourPayout(world: CombatWorld, point: CombatPoint, coins: number): void {
        const item = world.item("cobblemon:relic_coin") !== null ? "cobblemon:relic_coin" : "minecraft:gold_nugget";
        const count = Math.max(1, Math.min(14, Math.round(coins)));
        for (let index = 0; index < count; index++) {
            const angle = world.random() * Math.PI * 2, speed = 0.15 * (0.6 + world.random() * 0.8);
            const drop = WorldCombat.point(Math.cos(angle) * 0.4, 0.4 + world.random() * 0.3, Math.sin(angle) * 0.4);
            try {
                world.dropItem(point.plus(drop), item, 1,
                    JSON.stringify({ pickupDelay: 16, velocity: [Math.cos(angle) * speed, 0.22, Math.sin(angle) * speed] }));
            } catch (error) { /* 掉落被拒绝时只保留粒子与机制 */ }
        }
        WorldFeedback.emit(world, happyhourScene, 1, point, { moment: "payout", coins: count }, 30);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.0, 0)), happyhourEarnText, [count], 32);
        world.sound("cobblemon:block.relic_coin_pouch.place", point, 16, "{}");
    }

    // 金色时光场地：每 5 刻续一次金光，让玩家看见这段时间还在。
    WorldEffects.fieldRule(happyhourField, {
        scan: function (effect, world, field) {
            const centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            WorldFeedback.keep(world, "happyhour:" + effect.id(), happyhourScene, 1, centre,
                { moment: "hold", radius: field.radius, motes: Math.max(14, Math.round(Number(field.data.motes) || 20)),
                    scale: field.radius / 4.5 }, 40);
        }
    });

    // 战果变现：任何在金色场地里倒下的非友方，当场爆出一捧真币。
    WorldCombat.on("world_combat:move_happyhour/payout", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (!(data.after <= 0)) return;
        const victim = event.target();
        const world = event.world();
        if (victim === null || !world.valid(victim) || world.friendly(victim)) return;
        if (typeof data.x !== "number" || typeof data.y !== "number" || typeof data.z !== "number") return;
        const point = WorldCombat.point(data.x, data.y, data.z);
        const zones = WorldEffects.areas(world, happyhourField);
        for (let i = 0; i < zones.length; i++) {
            const zone = zones[i];
            const centre = WorldCombat.point(zone.position[0], zone.position[1], zone.position[2]);
            if (centre.minus(point).length() > zone.radius + 0.5) continue;
            if (String(victim.ref()) === String(zone.data.caster)) continue;
            happyhourPayout(world, point, Number(zone.data.purse) || 1);
            return;
        }
    });

    define({
        id: "happyhour",
        name: "Happy Hour",
        description: "当场摆开一场小型庆典，在自己脚下铺出一圈金色时光；在这段时光里，任何在圈内倒下的"
            + "非友方都会当场爆出一捧本来到战后才结算的 Relic Coin。它不攻击、不撒钱，只把战果变现。",
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
            MobEffects.apply(world, self, happyhourBanner, ticks, 0);
            WorldEffects.field(world, happyhourField, origin, radius,
                { coins: coins, purse: coins, radius: radius, motes: motes, caster: String(self.ref()) }, ticks);
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
