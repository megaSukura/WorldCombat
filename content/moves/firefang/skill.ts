/**
 * 火焰牙 / firefang 的出手方式。
 *
 * 核心念头：**短咬一口，把火按进伤口**——不扑不冲，合牙的一刻就在口边结算；火是否种得进去走原生免疫规则，
 * 点不着时火只在表面散开。它是本族里最短、最直接的一口。
 *
 * 三幕：
 *   起（windup，提交前）：牙间燃起火种、火星四散，只播预告表现。
 *   咬（bite）：提交后朝瞄准方向做一段真实的短 trace；第一个碰到的人或墙就是这一口合上的地方，
 *       命中非友方即结算 fang 接触咬合，命中点炸开火色迸溅与獠牙剪影。空咬、咬到友方或先撞墙都不种火。
 *   灌（sear / scatter / flinch）：按 scorchChance 掷点火，走共享状态的原生免疫；真点着才播 sear 与浮字，
 *       被免疫拒绝则只播 scatter（火在表面四散熄灭）。按 flinchChance 掷畏缩，挂共享身份并投递 interrupt。
 *
 * 配置 `sear`（焦焰式）由公式改点火几率／时长与咬合威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const firefangScene = "world_combat:move_firefang";
    const firefangFlinchEffect = "world_combat:firefang_flinch";
    const firefangHitText = "world_combat.move.firefang.text.hit";
    const firefangBurnText = "world_combat.move.firefang.text.burn";
    const firefangFlinchText = "world_combat.move.firefang.text.flinch";
    const firefangMissText = "world_combat.move.firefang.text.miss";

    function firefangFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, firefangFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    define({
        freeMovement: true,
        id: "firefang",
        cooldownParameter: "recharge",
        name: "Fire Fang",
        description: "贴身短咬一口，把火按进伤口：命中造成咬合伤害，并按几率点燃目标——点火走原生免疫，火属性或免疫特性的身体点不着，火只在表面散开；咬得够狠还会把对手咬懵。焦焰式更容易点着、烧得更久，快咬式咬得更重。",
        uses: ["贴身短咬一口并按几率点着目标", "用最短的一口给近敌挂火", "咬懵对手，打断它正在做的事"],
        kind: "aim",
        range: 2.1,
        maxRange: 3.4,
        prepare: 5,
        active: 24,
        recover: 6,
        cooldown: 16,
        style: "bite",
        defaults: { sear: false, ai: { maxChase: 8, seekUnlit: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("firefang", "grip", pokemon) : 0.42) * 1.5, geometry: "line", style: "bite",
                color: 0xE2531B, label: config && config.sear === true ? "焦焰式" : "火焰牙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["firefang"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(3, Math.round(p("firefang", "tempo", context))),
                recover: Math.max(3, Math.round(p("firefang", "aftercast", context))),
                cooldown: Math.max(9, Math.round(p("firefang", "recharge", context))),
                active: skills["firefang"].active,
                range: p("firefang", "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:firefang:windup", firefangScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", sear: config && config.sear === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const direction = aim(action);
            const radius = p("firefang", "grip", action);
            const power = p("firefang", "fang", action);
            const burnChance = Math.max(0.02, Math.min(0.95, p("firefang", "scorchChance", action)));
            const burnTicks = Math.max(60, Math.round(p("firefang", "scorchTicks", action)));
            const chance = Math.max(0.02, Math.min(0.9, p("firefang", "flinchChance", action)));
            const flinchTicks = Math.max(6, Math.round(p("firefang", "flinchTicks", action)));
            const embers = Math.max(5, Math.round(p("firefang", "embers", action)));
            const scale = radius / 0.42;
            const intensity = Math.max(0.5, Math.min(2.3, power / 66));
            const from = self.position();
            const end = from.plus(direction.scale(action.range()));

            // 自由短方向咬：从口边朝瞄准方向做一段真实短 trace，最先碰到的人或墙才是这一口合上的地方。
            const contact = action.trace(from, end, radius, true);
            const target = contact.target();
            const victim = contact.hitEntity() && target !== null && world.valid(target)
                && String(target.ref()) !== String(actor.ref()) && !world.friendly(target) ? target : null;

            if (victim === null) {
                // 空咬、咬到友方或先撞上墙：不种火，只收牙。
                const at = contact.hitEntity() || contact.blocked() ? contact.position() : end;
                WorldFeedback.emit(world, firefangScene, 1, at, { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), firefangMissText, [], 20);
                sound(action, "minecraft:entity.player.attack.sweep");
                done(action);
                return;
            }

            const at = contact.position();
            const victimRef = String(victim.ref());
            const landed = impact(action, contact, "firefang", power,
                { damage: damageSpec("firefang", "fang"), contact: true, bite: true });
            WorldFeedback.emit(world, firefangScene, 1, at,
                { moment: "bite", target: victimRef, embers: embers, scale: scale, intensity: intensity }, 24);
            sound(action, "cobblemon:impact.fire");
            if (!landed || !world.valid(victim)) { done(action); return; }
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), firefangHitText, [], 22);
            // 正常概率点火：不再开免疫窗口、不再无视特性。真点着才播 sear，被免疫则只散火。
            if (world.random() < burnChance) {
                const burned = CombatStatus.inflict(world, victim, "burn", burnTicks, 0, { secondary: true });
                if (burned) {
                    world.ignite(victim, Math.max(20, Math.min(60, Math.round(burnTicks * 0.2))));
                    WorldFeedback.emit(world, firefangScene, 1, at,
                        { moment: "sear", target: victimRef, embers: embers, scale: scale, intensity: intensity }, 26);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), firefangBurnText, [], 24);
                    sound(action, "minecraft:entity.blaze.burn");
                } else {
                    // 免疫/被拒：火只在表面炸开、四散熄灭，不种进伤口。
                    WorldFeedback.emit(world, firefangScene, 1, at,
                        { moment: "scatter", target: victimRef, embers: embers, scale: scale, intensity: intensity }, 22);
                }
            }
            if (world.valid(victim) && world.random() < chance && firefangFlinch(world, victim, flinchTicks)) {
                WorldFeedback.emit(world, firefangScene, 1, at, { moment: "flinch", target: victimRef, scale: scale }, 22);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.35, 0)), firefangFlinchText, [], 22);
            }
            done(action);
        }
    });

}
