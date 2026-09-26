/** A local oath grants owned stage layers while the caster remains inside its fixed boundary. */
namespace PokemonSkills {
    const noRetreatReferenceRing = 1.6;

    function noRetreatStandData(json: string): string {
        const value = JSON.parse(json);
        ["standTicks", "boosts", "surge", "ring", "scale", "intensity"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid no-retreat state");
        });
        return JSON.stringify(value);
    }

    WorldCombat.effect(noRetreatStand, 1, 600, "actor", noRetreatStandData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(noRetreatStand, "start", effect => effect.schedule("watch", "watch", 1, "{}"));
    WorldCombat.effectHandler(noRetreatStand, "watch", function (effect) {
        const world = effect.world(), self = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(self) || !MobEffects.matches(world, self, data.carrier)) { effect.end(); return; }
        const result = WorldBoundaries.contain(world, self, { centre: WorldCombat.point(data.centre[0], data.centre[1], data.centre[2]),
            radius: data.ring, margin: .35, height: 3, step: .45 }, (actor, delta) => world.displace(actor, delta));
        if (result === "escaped" || result === "refused") { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(noRetreatStand, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(noRetreatStand, "end", function (effect) {
        const world = effect.world(), self = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(self)) {
            const mark = MobEffects.read(world, self, noRetreatEffect);
            if (mark !== null && MobEffects.matches(world, self, data.carrier)) world.removeMobEffect(self, noRetreatEffect, mark.key());
            const body = world.observe(self);
            if (body !== null) {
                WorldFeedback.emit(world, noRetreatScene, 1, body.position(),
                    { moment: "release", target: String(self.ref()), ring: data.ring, scale: data.scale }, 26);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.1, 0)), noRetreatReleaseText, [], 22);
            }
        }
    });

    // 阵环被清掉（牛奶／/effect clear）时收回标记，避免留下没有结算的立誓。
    WorldCombat.on("world_combat:move_noretreat/release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== noRetreatEffect) return;
        const world = event.world(), self = event.actor();
        if (!world.valid(self)) return;
        const marks = world.effects(self, noRetreatStand);
        for (let index = 0; index < marks.length; index++) world.operation(marks[index].id(), "world_combat:dispel", "{}");
    });

    define({
        freeMovement: true,
        id: noRetreatId,
        cooldownParameter: "recharge",
        name: "背水一战",
        description: "在脚下立起小型阵界，获得一段全项强化；可在圈内走位，靠近边缘受收束。被外力带出、状态清除或到期时只撤本次强化。",
        uses: ["贴近目标后强化自己，站定迎战", "被追上时用一次全项强化换最后一段输出", "配合队友的控制，把强化窗口放在对方走不掉的时候"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 160,
        style: "stand",
        stationary: true,
        defaults: { rush: false, ai: { maxChase: 12 } },
        fields: [
            field(pathOf("rush"), "疾战", "boolean", { help: "开启（疾战）：只顶起攻击、特攻、速度三项，立誓时长减半、冷却 ×0.75——出手快、脱身快，但放弃双防。关闭（背水）：五项全 +1，站得更久、冷却更长——全面强化，但在阵界内迎战更久。" })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[noRetreatId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(noRetreatId, "tempo", context)),
                recover: Math.round(p(noRetreatId, "aftercast", context)),
                cooldown: Math.round(p(noRetreatId, "recharge", context)),
                active: 1,
                range: 1
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            if (world.observe(self) === null) return "invalid-target";
            if (CombatStatus.has(world, self, "noretreat")) return "already-noretreat";
            return "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_noretreat:gather", noRetreatScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", rush: config && config.rush === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(noRetreatId, "ring"), geometry: "circle", style: "stand", color: 0xE0B040,
                label: config && config.rush === true ? "背水一战 · 疾战" : "背水一战" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            if (CombatStatus.has(world, self, "noretreat")) { done(action); return; }
            const rush = !!(config && config.rush);
            const standTicks = Math.max(80, Math.round(p(noRetreatId, "standTicks", action)));
            const surge = Math.max(8, Math.round(p(noRetreatId, "surge", action)));
            const ring = Math.max(2.4, p(noRetreatId, "ring", action));
            const scale = Math.max(0.5, Math.min(2.2, ring / noRetreatReferenceRing));
            const intensity = Math.max(0.7, Math.min(2.2, surge / 20));
            const stats = rush ? ["atk", "spa", "spe"] : ["atk", "def", "spa", "spd", "spe"];
            const carrier = MobEffects.apply(world, self, noRetreatEffect, standTicks, 0);
            if (!carrier) { done(action); return; }
            const stages: { [key: string]: number } = {}; stats.forEach(stat => stages[stat] = 1);
            NativeEffects.boostWindow(world, self, stages, standTicks, "world_combat:move/noretreat", carrier);
            const centre = body.position();
            const stand = world.effect(noRetreatStand, self, JSON.stringify({ standTicks, boosts: stats.length, surge, ring, scale, intensity,
                centre: [centre.x(), centre.y(), centre.z()], carrier: MobEffects.anchor(carrier) }), standTicks);
            WorldFeedback.onEffect(world, stand, "noretreat:stand:" + stand, noRetreatScene, 1, centre.plus(WorldCombat.point(0, -body.height() / 2 + .03, 0)),
                { moment: "stand", boosts: stats.length, surge, ring, scale, intensity });
            WorldFeedback.emit(world, noRetreatScene, 1, body.position(),
                { moment: "burst", target: String(self.ref()), boosts: stats.length, surge: surge, ring: ring,
                    scale: scale }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), noRetreatRootText,
                [stats.length, Math.round(standTicks / 20 * 10) / 10], 28);
            sound(action, "minecraft:entity.ravager.roar");
            done(action);
        }
    });
}
