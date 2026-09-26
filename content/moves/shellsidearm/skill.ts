/**
 * 臂贝武器 / shellsidearm —— 出手方式。
 *
 * 核心念头：一发**瞄准对方软肋的毒壳重击**。施法者把带毒的壳压进发射腔，射击前先看清这一发该怎么打：
 *   对方贴到近身、且钝击（物理）比喷射（特殊）更疼，就伸臂把壳**横砸**上去（真实短 trace、物理/接触）；
 *   否则把毒液**喷**出去（有限追踪的投射物、特殊/非接触）。同一份 `power`，用哪一面在**释放时**就定死。
 *
 * 幕：
 *   起（windup，提交前）：把毒壳压进发射腔、毒气从缝里冒出的预告（`action.present`，可被打断、不花 PP）。
 *   发（execute）：
 *     · 钝击（`swing` → `ram`）：朝瞄准方向伸臂做一次短 3D 横砸，`action.trace` 只结算真实首碰；命中处炸开壳屑与冲击环。
 *     · 喷射（`fire`/`shell` → `spray`）：毒液投射物有限追踪飞出，命中处扩散毒云。
 *   中（ram / spray / whiff）：命中处按这一面结算物理或特殊伤害；随后按概率让目标中毒。没碰到就落空。
 *
 * 形态 `form`（配置）：
 *   0 自动（默认）：释放时先看实际距离——近处可触范围内按 CombatantStats 物特比较决定砸/喷，远处只能用喷射；
 *       无目标默认喷射，手动点地也可以钝击空砸。
 *   1 钝击：强制物理/接触，威力 ×1.05，但只能打到 `touch` 那么近，弹速 ×0.85、起手 +2、冷却 +4。
 *   2 喷射：强制特殊/非接触，射程 ×1.15、弹速 ×1.15，但威力 ×0.95。
 *
 * 分裂方式：类别在释放时定，不再在飞行中改判；伤害段 `category` 作为本次伤害 features 传入，
 *   所以**演的那一面就是真正结算的那一面**，伤害公式按实际命中者求值。
 */
namespace PokemonSkills {
    const shellsidearmScene = "world_combat:move_shellsidearm";
    const shellsidearmVenomText = "world_combat.move.shellsidearm.text.venom";
    const shellsidearmImmuneText = "world_combat.move.shellsidearm.text.immune";
    const shellsidearmWhiffText = "world_combat.move.shellsidearm.text.whiff";

    /**
     * 自动形态的近身选择：钝击（物理）与喷射（特殊）各按对手的物防/特防比一比，取伤害更高的一面。
     * 只在对方真的在近身可触范围内才调用；无目标时由调用方直接选喷射。
     */
    function shellsidearmPhysical(action: CombatAction): boolean {
        const world = action.world();
        const target = action.target();
        if (target === null || !world.valid(target)) return false;
        const me = PokemonDamage.combatants.read(world, action.actor());
        const you = PokemonDamage.combatants.read(world, target);
        const spec = damageSpec("shellsidearm", "power");
        const power = Math.max(1, p("shellsidearm", "power", action));
        const physical = CombatantStats.calculate(power, me.stats.atk || 0, CombatantStats.defence(you, "def"), spec).amount;
        const special = CombatantStats.calculate(power, me.stats.spa || 0, CombatantStats.defence(you, "spd"), spec).amount;
        if (physical > special) return true;
        if (special > physical) return false;
        return world.random() < 0.5;
    }

    define({
        id: "shellsidearm",
        cooldownParameter: "recharge",
        name: "Shell Side Arm",
        description: "把带毒的壳压进发射腔射出去。释放时先看清这一发怎么打：对方贴到近身、钝击更疼就伸臂横砸（物理·接触），否则喷出毒液（特殊·非接触）。命中后按概率让目标中毒。可固定用钝击（更狠但只能打近身）或喷射（更远更稳）。",
        uses: ["对软肋不明的目标打最高伤害", "远距离的一记毒液重炮", "切进钝击模式贴脸爆发"],
        kind: "aim",
        range: 14,
        maxRange: 20,
        prepare: 12,
        active: 2,
        recover: 9,
        cooldown: 34,
        style: "shell",
        defaults: { form: 0, ai: { maxChase: 18, finishLow: true, longShot: true, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shellsidearm"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const form = config && typeof config.form === "number" ? config.form : 0;
            return {
                prepare: Math.round(p("shellsidearm", "charge", context)),
                recover: Math.round(p("shellsidearm", "settle", context)),
                cooldown: Math.round(p("shellsidearm", "recharge", context)),
                active: 2,
                // 钝击形态只能用近身距离；其余形态用喷射射程。AI 的 reach 因此与两形态一致。
                range: form === 1 ? p("shellsidearm", "touch", context) : p("shellsidearm", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const cloud = Math.max(6, Math.round(p("shellsidearm", "venomCloud", action)));
            const form = config && typeof config.form === "number" ? config.form : 0;
            action.present("shellsidearm:charge:" + action.id(), shellsidearmScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, cloud: cloud, form: form }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["shellsidearm"], detail: { values: config } };
            const form = config && typeof config.form === "number" ? config.form : 0;
            return { radius: form === 1 ? p("shellsidearm", "touch", context) : p("shellsidearm", "reach", context),
                geometry: "line", style: "shell", color: 0x8A6BA8,
                label: form === 1 ? "臂贝武器·钝击" : form === 2 ? "臂贝武器·喷射" : "臂贝武器" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const direction = aim(action);
            const form = config && typeof config.form === "number" ? config.form : 0;
            const me = world.observe(action.actor());
            const origin = me === null ? action.origin() : me.position();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const touch = Math.max(1.6, Math.min(3, p("shellsidearm", "touch", action)));
            const inTouch = targetBody !== null && targetBody.position().minus(origin).length() <= touch + targetBody.width() * 0.5;
            // 释放时定死这一发：自动只在近身可触范围内比较物特，否则喷射；无目标喷射。
            const physical = form === 1 ? true : form === 2 ? false : (inTouch && shellsidearmPhysical(action));
            const category = physical ? "physical" : "special";
            const power = p("shellsidearm", "power", action);
            const speed = p("shellsidearm", "shellSpeed", action);
            const radius = p("shellsidearm", "shellRadius", action);
            const chance = p("shellsidearm", "poisonChance", action);
            const venomTicks = Math.max(40, Math.round(p("shellsidearm", "venomTicks", action)));
            const cloud = Math.max(8, Math.round(p("shellsidearm", "venomCloud", action)));
            const scale = Math.max(0.6, Math.min(2, radius / 0.3));
            const intensity = Math.max(0.6, Math.min(2, power / 90));

            if (physical) {
                // 真正的短距近身横砸：从身体中心沿瞄准方向伸出不超过 3 格 + 身体边界的真实 3D trace，首碰即停。
                const halfSelf = me === null ? 0.45 : me.width() * 0.5;
                const span = touch + halfSelf;
                const end = origin.plus(direction.scale(span));
                const hit = action.trace(origin, end, radius, true);
                const victim = hit.hitEntity() ? hit.target() : null;
                const contact = hit.position();
                const reach = Math.max(0.4, Math.min(span, contact.minus(origin).length()));
                sound(action, "minecraft:item.trident.throw");
                WorldFeedback.emit(world, shellsidearmScene, 1, origin,
                    { moment: "swing", direction: [direction.x(), direction.y(), direction.z()], reach: reach,
                        cloud: Math.round(cloud * 0.5), scale: scale, intensity: intensity }, 20);
                if (victim !== null && !world.friendly(victim)) {
                    const dealt = hurt(action, victim, "shellsidearm", power,
                        { damage: damageSpec("shellsidearm", "power"), category: category, contact: true });
                    if (dealt) {
                        let poisoned = false;
                        if (world.valid(victim) && world.random() < chance)
                            poisoned = CombatStatus.inflict(world, victim, "poison", venomTicks, 0, { secondary: true });
                        const body = world.valid(victim) ? world.observe(victim) : null;
                        const at = body === null ? contact : body.position();
                        WorldFeedback.emit(world, shellsidearmScene, 1, at,
                            { moment: "ram", target: String(victim.ref()), cloud: cloud, scale: scale, intensity: intensity }, 30);
                        if (poisoned) {
                            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), shellsidearmVenomText, [], 26);
                            world.sound("cobblemon:impact.poison", at, 16, "{}");
                        }
                        world.sound("minecraft:entity.generic.explode", at, 18, "{}");
                    } else {
                        WorldFeedback.emit(world, shellsidearmScene, 1, contact,
                            { moment: "whiff", cloud: Math.round(cloud * 0.5), scale: scale }, 18);
                        WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 0.9, 0)), shellsidearmImmuneText, [], 22);
                    }
                } else {
                    WorldFeedback.emit(world, shellsidearmScene, 1, contact,
                        { moment: "whiff", cloud: Math.round(cloud * 0.5), scale: scale }, 18);
                    WorldFeedback.text(world, contact.plus(WorldCombat.point(0, 0.6, 0)), shellsidearmWhiffText, [], 18);
                }
                done(action);
                return;
            }

            // 喷射：有限追踪的毒液投射物，特殊/非接触。
            let ref = target !== null && world.valid(target) ? String(target.ref()) : "";
            const appearance: any = { sprite: "cobblemon:generic/goo/chemicalball", tint: 0x8A6BA8, glow: true, scale: Math.max(0.9, radius / 0.3) };
            if (ref) appearance.homing = { target: ref, turn: 12, range: action.range() };
            let struck = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:item.trident.throw");
            WorldFeedback.emit(world, shellsidearmScene, 1, action.origin(),
                { moment: "fire", direction: [direction.x(), direction.y(), direction.z()], cloud: cloud,
                    scale: scale, intensity: intensity, physical: 0 }, 22);
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, direction: direction, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact, age: number) {
                    struck = true;
                    const scope = current.world();
                    const victim = hit.target();
                    const point = hit.position();
                    let poisoned = false;
                    if (victim !== null && scope.valid(victim)) {
                        ref = String(victim.ref());
                        const dealt = impact(current, hit, "shellsidearm", power,
                            { damage: damageSpec("shellsidearm", "power"), category: category, contact: false });
                        if (!dealt) {
                            const at = scope.observe(victim);
                            if (at !== null) WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), shellsidearmImmuneText, [], 22);
                        }
                        if (dealt && scope.valid(victim) && scope.random() < chance)
                            poisoned = CombatStatus.inflict(scope, victim, "poison", venomTicks, 0, { secondary: true });
                    }
                    WorldFeedback.emit(scope, shellsidearmScene, 1, point,
                        { moment: "spray", target: ref, cloud: cloud, projectile: flight,
                            scale: scale, intensity: intensity }, 30);
                    if (poisoned) {
                        const at = scope.observe(victim!);
                        if (at !== null) WorldFeedback.text(scope, at.position().plus(WorldCombat.point(0, 1.1, 0)), shellsidearmVenomText, [], 26);
                        scope.sound("cobblemon:impact.poison", point, 16, "{}");
                    }
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    WorldFeedback.emit(current.world(), shellsidearmScene, 1, current.targetPosition(),
                        { moment: "whiff", cloud: Math.round(cloud * 0.5), scale: scale }, 18);
                    WorldFeedback.text(current.world(), current.targetPosition().plus(WorldCombat.point(0, 0.5, 0)), shellsidearmWhiffText, [], 18);
                }
                finish(current);
            });
            WorldFeedback.keep(world, "shellsidearm:shell:" + action.id(), shellsidearmScene, 1, action.origin(),
                { moment: "shell", projectile: flight, cloud: cloud, scale: scale, intensity: intensity }, 120);
        }
    });
}
