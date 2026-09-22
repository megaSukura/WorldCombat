/**
 * 麻痹粉 / Stun Spore — 出手方式。
 *
 * 核心念头：一团抛出去、落下就不散的麻痹花粉。施法者把粉团抛向目标所在的位置，粉团落地炸开成一片持续存在的云；
 *   谁站在云里谁一直被麻住，走出去之后麻痹按自己的时间慢慢走完。它是三式麻痹里唯一留在世界上的那个：
 *   对手可以走位绕开、等它散去，也可以把敌人赶进去。草属性对粉末免疫、电属性对麻痹免疫。
 *
 * 幕：
 *   起（windup，提交前）：掌心拢粉的预告（`action.present`）。
 *   掷（throw）：提交后低弧抛出粉团，`LivingActions.projectile` 负责飞行与碰撞。
 *   落（burst → linger）：粉团落地炸开，注册一片共享场地 `world_combat:move_stunspore_cloud`（WorldEffects.field），
 *       云里的非友方被持续刷新共享的 `world_combat:status/paralysis`（宝可梦那一层由共享默认效果同步成原生麻痹）；
 *       云在 `cloudTicks` 后自然散去，走出云外的人按 holdTicks 走完残余的麻痹。
 *
 * 反制：走出云外、绕开落点、等云散去；草属性穿过粉末、电属性穿过麻痹。云以施法者为源，被收回或远离则随之结束。
 */
namespace PokemonSkills {
    const stunsporeScene = "world_combat:move_stunspore";
    const stunsporeCaughtText = "world_combat.move.stunspore.text.caught";
    const stunsporeLandText = "world_combat.move.stunspore.text.land";

    /** 草属性对粉末免疫：它直接穿过这团云。 */
    function stunsporeGrassImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let i = 0; i < pokemon.typeCount(); i++) if (String(pokemon.type(i)) === "grass") return true;
        return false;
    }

    // 麻痹粉云的行为：站在云里的非友方被持续刷新麻痹，走出云外按残余时间走完。
    WorldEffects.fieldRule(stunsporeField, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor) || stunsporeGrassImmune(world, actor)) return;
            const hold = Math.max(20, Math.round((field.data && field.data.hold) || 60));
            const fresh = !CombatStatus.has(world, actor, "paralysis");
            if (!CombatStatus.inflict(world, actor, "paralysis", hold)) return;
            if (!fresh) return;
            const body = world.observe(actor);
            if (body === null) return;
            WorldFeedback.emit(world, stunsporeScene, 1, body.position(),
                { moment: "caught", target: String(actor.ref()), spores: (field.data && field.data.spores) || 16 }, 24);
            WorldFeedback.text(world, body.position(), stunsporeCaughtText, [Math.round(hold / 20)], 28);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const centre = WorldCombat.point(field.position[0], field.position[1], field.position[2]);
            const scale = Math.max(0.5, Math.min(2.2, field.radius / 2.3));
            WorldFeedback.keep(world, "stunspore:cloud:" + effect.id(), stunsporeScene, 1, centre,
                { moment: "linger", scale: scale, spores: (field.data && field.data.spores) || 16 }, 40);
        }
    });

    define({
        id: stunsporeId,
        name: "Stun Spore",
        description: "The user scatters a cloud of numbing powder that paralyzes the target.",
        uses: ["封住一条通道或门口", "让追兵踩进云里慢下来", "把敌人逼进/逼出某片地"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 90,
        style: "powder",
        defaults: { thick: false, ai: { maxChase: 9, renew: false, leaveStation: true } },
        fields: [
            flag("thick", "厚云")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[stunsporeId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(stunsporeId, "tempo", context)),
                recover: p(stunsporeId, "recover", context),
                cooldown: Math.round(p(stunsporeId, "recharge", context)),
                active: 1,
                range: p(stunsporeId, "throwReach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("stunspore:windup:" + action.id(), stunsporeScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", thick: config && config.thick ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[stunsporeId], detail: { values: config } };
            return { radius: p(stunsporeId, "cloudRadius", context), geometry: "area", style: "powder", color: 0xE8C81E,
                label: config && config.thick === true ? "麻痹粉·厚云" : "麻痹粉·散云" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const speed = Math.max(0.6, p(stunsporeId, "puffSpeed", action));
            const radius = Math.max(1.2, p(stunsporeId, "cloudRadius", action));
            const ticks = Math.max(60, Math.round(p(stunsporeId, "cloudTicks", action)));
            const hold = Math.max(20, Math.round(p(stunsporeId, "holdTicks", action)));
            const spores = Math.max(8, Math.round(p(stunsporeId, "spores", action)));
            const scale = Math.max(0.5, Math.min(2.2, radius / 2.3));
            let settled = false;

            function burst(current: CombatAction, point: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldEffects.field(scope, stunsporeField, point, radius, { hold: hold, spores: spores }, ticks);
                WorldFeedback.emit(scope, stunsporeScene, 1, point,
                    { moment: "burst", radius: radius, spores: spores, scale: scale }, 26);
                WorldFeedback.text(scope, point, stunsporeLandText, [], 26);
                sound(current, "cobblemon:move.stunspore.target");
                done(current);
            }

            sound(action, "cobblemon:move.stunspore.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.26, lifetime: 100,
                appearance: { sprite: "cobblemon:particle/generic/powder", scale: 0.9, tint: 0xE8C81E },
                impact: function (current, hit) { burst(current, hit.position()); }
            }, function (current) { burst(current, current.targetPosition()); });
            WorldFeedback.emit(world, stunsporeScene, 1, origin,
                { moment: "throw", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                    scale: scale, spores: spores }, 30);
        }
    });
}
