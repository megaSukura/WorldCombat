/**
 * 惊吓 / astonish 的出手方式。
 *
 * 核心念头：没有预警的一声尖叫——起手为 0，把尖啸当场砸在贴身的对手脸上；伤害很轻，
 * 值钱的是那一下几乎必然的一滞，而且**越暗越吓人**。它是最快的一式，代价是极短射程与很轻的单发。
 *
 * 一幕半：
 *   呼（scream，提交即发生）：瞬发，不经过起手；若目标在贴近距离内，施法者朝它蹭近一小步，
 *       在它脸上炸开一声尖叫，结算 shriek 接触伤害并按 flinchChance 掷畏缩。
 *   果（hit / flinch / miss）：命中的浮“尖叫”并按共享身份挂上畏缩；扑空只留一声空响。
 *
 * 与同族分开：咬住把人拽近、踩踏靠体重下砸、骨棒是长柄横扫；只有惊吓在黑暗里更凶，也唯一瞬发。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `lurk`（潜吓式）由 resolve 改时序、由公式改威力／距离／几率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const astonishScene = "world_combat:move_astonish";
    const astonishFlinchEffect = "world_combat:astonish_flinch";
    const astonishHitText = "world_combat.move.astonish.text.hit";
    const astonishFlinchText = "world_combat.move.astonish.text.flinch";
    const astonishMissText = "world_combat.move.astonish.text.miss";

    function astonishFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, astonishFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    function astonishInGloom(world: CombatWorld, point: CombatPoint): boolean {
        const environment = WorldEnvironment.read(world, point), light = Number(environment.blockLight);
        return !isFinite(light) || light < 7;
    }

    define({
        freeMovement: true,
        id: "astonish",
        cooldownParameter: "recharge",
        name: "Astonish",
        description: "没有预警的一声尖叫：起手为 0 的贴脸瞬发打断，伤害很轻，却几乎必然让目标一滞；环境越暗，威力、畏缩几率与持续都更强。",
        uses: ["瞬发的一声尖叫打断贴身的对手", "在黑暗里把目标吓懵更久", "用极低的代价给连段开一个头"],
        kind: "enemy",
        range: 1.8,
        maxRange: 2.8,
        prepare: 0,
        active: 0,
        recover: 6,
        cooldown: 15,
        style: "scare",
        defaults: { lurk: false, ai: { maxChase: 7, opening: "always" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p("astonish", "burst", pokemon) : 0.38) * 1.6, geometry: "area", style: "scare",
                color: 0x8A7AB8, label: config && config.lurk === true ? "潜吓" : "惊吓" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["astonish"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: 0,
                recover: Math.round(p("astonish", "aftercast", context)),
                cooldown: Math.round(p("astonish", "recharge", context)),
                active: 0,
                range: p("astonish", "reach", context) + 0.35
            };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const self = world.observe(actor);
            const victim = target !== null && world.valid(target) ? world.observe(target) : null;
            const direction = aim(action);
            const reach = p("astonish", "reach", action);
            const radius = p("astonish", "burst", action);
            const power = p("astonish", "shriek", action);
            const chance = p("astonish", "flinchChance", action);
            const flinchTicks = Math.round(p("astonish", "flinchTicks", action));
            const scale = radius / 0.38;

            if (self === null || victim === null || target === null) {
                WorldFeedback.emit(world, astonishScene, 1, action.origin(), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, action.origin().plus(WorldCombat.point(0, 1.1, 0)), astonishMissText, [], 20);
                done(action);
                return;
            }
            const foe = target;

            // 疾呼式朝目标蹭近一小步；潜吓式几乎不动。
            const toTarget = victim.position().minus(self.position());
            const gap = toTarget.length();
            const close = Math.max(0, gap - radius - 0.3);
            const step = Math.min(reach, close);
            if (step > 0.02) world.displace(actor, toTarget.unit().scale(step));

            const moved = world.observe(actor);
            const at = moved !== null ? moved.position().plus(direction.scale(radius + 0.1)) : action.origin();
            const dark = astonishInGloom(world, at);
            const bang = Math.max(6, Math.round(power * 0.4)), fright = Math.round(chance * 100);
            WorldFeedback.emit(world, astonishScene, 1, at,
                { moment: "scream", target: String(foe.ref()), scale: scale, gloom: dark ? 1 : 0, fright: fright, bang: bang }, 24);
            sound(action, "minecraft:entity.enderman.scream");

            const damaged = hurt(action, foe, "astonish", power, { damage: damageSpec("astonish", "shriek"), contact: true });
            WorldFeedback.emit(world, astonishScene, 1, at,
                { moment: "hit", target: String(foe.ref()), scale: scale, gloom: dark ? 1 : 0, fright: fright, bang: bang }, 22);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), astonishHitText, [], 22);
            sound(action, "cobblemon:impact.ghost");
            if (damaged && world.valid(foe) && world.random() < chance && astonishFlinch(world, foe, flinchTicks)) {
                WorldFeedback.emit(world, astonishScene, 1, at, { moment: "flinch", target: String(foe.ref()) }, 24);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.35, 0)), astonishFlinchText, [], 24);
            }
            done(action);
        }
    });

}
