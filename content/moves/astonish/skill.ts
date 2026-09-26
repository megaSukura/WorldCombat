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
        description: "没有预警的一声尖叫：起手为 0 的贴脸瞬发打断，伤害很轻，却几乎必然让目标一滞；墙会先挡下这一声，环境越暗，威力、畏缩几率与持续都更强。",
        uses: ["瞬发的一声尖叫打断贴身的对手", "在黑暗里把目标吓懵更久", "用极低的代价给连段开一个头"],
        kind: "aim",
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
            const self = world.observe(actor);
            // 贴地尖叫：方向取水平分量，避免身体贴着地面时被脚下的地面挡下。
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() > 0.001 ? flat.unit() : aimed;
            const reach = p("astonish", "reach", action);
            const radius = p("astonish", "burst", action);
            const power = p("astonish", "shriek", action);
            const chance = p("astonish", "flinchChance", action);
            const flinchTicks = Math.round(p("astonish", "flinchTicks", action));
            const scale = radius / 0.38;

            if (self === null) {
                WorldFeedback.emit(world, astonishScene, 1, action.origin(), { moment: "miss", scale: scale }, 18);
                WorldFeedback.text(world, action.origin().plus(WorldCombat.point(0, 1.1, 0)), astonishMissText, [], 20);
                done(action);
                return;
            }

            // 极短步朝瞄准方向蹭近；真实碰撞（墙或前排身体）会先把它停下，不要求存在敌人。
            const swept = sweepStep(action, direction.scale(reach), radius);
            const here = action.origin();
            // 从实际原点略高处检查短距前方：第一个身体（含同伴）或墙就是这一声真实的接触点。
            const mouth = here.plus(WorldCombat.point(0, 0.45, 0));
            const contact = action.trace(mouth, mouth.plus(direction.scale(radius + 0.5)), radius, true);
            // 判定优先取射线首碰；射线没碰到身体时，退回这一步里真实撞上的那个身体。
            let lander = contact.hitEntity() ? contact.target() : null;
            let landPoint: CombatPoint | null = contact.hitEntity() ? contact.position() : null;
            if (lander === null && swept.hit.hitEntity()) { lander = swept.hit.target(); landPoint = swept.hit.position(); }
            const victim = lander !== null && String(lander.ref()) !== String(actor.ref()) && !world.friendly(lander) ? lander : null;
            const body = victim !== null ? world.observe(victim) : null;
            const at = body !== null ? body.position() : (landPoint !== null ? landPoint : contact.position());
            const dark = astonishInGloom(world, at);
            const bang = Math.max(6, Math.round(power * 0.4)), fright = Math.round(chance * 100);
            WorldFeedback.emit(world, astonishScene, 1, at,
                { moment: "scream", target: victim !== null ? String(victim.ref()) : "", scale: scale, gloom: dark ? 1 : 0, fright: fright, bang: bang }, 24);
            sound(action, "minecraft:entity.enderman.scream");

            if (victim !== null) {
                const damaged = hurt(action, victim, "astonish", power, { damage: damageSpec("astonish", "shriek"), contact: true });
                WorldFeedback.emit(world, astonishScene, 1, at,
                    { moment: "hit", target: String(victim.ref()), scale: scale, gloom: dark ? 1 : 0, fright: fright, bang: bang }, 22);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), astonishHitText, [], 22);
                sound(action, "cobblemon:impact.ghost");
                // 畏缩只随实际成功状态，被拒或没打中不冒假反馈。
                if (damaged && world.valid(victim) && world.random() < chance && astonishFlinch(world, victim, flinchTicks)) {
                    WorldFeedback.emit(world, astonishScene, 1, at, { moment: "flinch", target: String(victim.ref()) }, 24);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.35, 0)), astonishFlinchText, [], 24);
                }
            } else if (contact.blocked()) {
                // 墙挡短步：只在真实墙面留一声短回声，墙后实体不受击。
                const wall = contact.blockPosition() || contact.position();
                WorldFeedback.emit(world, astonishScene, 1, wall, { moment: "echo", scale: scale, face: contact.blockFace() }, 18);
            } else {
                // 空放仍在面前尖叫，只留一声空响。
                WorldFeedback.emit(world, astonishScene, 1, at, { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), astonishMissText, [], 20);
            }
            done(action);
        }
    });

}
