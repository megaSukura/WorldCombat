/**
 * 硬撑 / facade 的出手方式。
 *
 * 念头的形状：带着身上的异常沉身压低（brace）→ 沿瞄准方向逐刻冲出去（drive）→ 撞上活体的一刻走共享 impact 结算接触伤害，
 * 只有真正打实（impact 返回 true）才把目标沿冲撞方向顶开、并在“变本加厉”下反噬自己；免疫或未打实只收势。
 * 正前方是方块、空放或被顶到走不动就提前结束。一幕做透：压身、冲撞、撞实、顶开。
 * 身上的异常种类决定冲击的色相（燃烧橙、中毒紫、麻痹黄、冰冻青），异常本身不因这一下消失。
 * 提交前只有 7 刻的压低准备（windup 预告，用 sense 读异常用于上色），提交后才触碰世界。
 */
namespace PokemonSkills {
    const facadeScene = "world_combat:move_facade";
    const facadeGritText = "world_combat.move.facade.text.grit";
    const facadeWhiffText = "world_combat.move.facade.text.whiff";

    /** 身上带着的异常种类，用于给冲击上色：0 无、1 灼伤、2 中毒/剧毒、3 麻痹、4 冰冻。 */
    function facadeAffliction(world: CombatWorld, actor: CombatActor): number {
        if (CombatStatus.has(world, actor, "burn")) return 1;
        if (CombatStatus.has(world, actor, "poison")) return 2;
        if (CombatStatus.has(world, actor, "paralysis")) return 3;
        if (CombatStatus.has(world, actor, "frozen")) return 4;
        return 0;
    }
    function facadeTint(code: number): number {
        if (code === 1) return 0xFF7A1E;
        if (code === 2) return 0x9B4DCA;
        if (code === 3) return 0xF2D93A;
        if (code === 4) return 0x8FE3F5;
        return 0xE8D8B0;
    }

    define({
        freeMovement: true,
        id: "facade",
        name: "Facade",
        description: "带着身上的异常硬顶过去：处于中毒／剧毒、灼伤、麻痹时威力翻倍，越剩不下命也越狠，这一记还不吃灼伤的物理减攻。撞实后把目标顶开；开启“变本加厉”还能打得更重，但会反噬自己。",
        uses: ["带伤硬顶", "残血时反打", "把贴身之敌顶开"],
        kind: "aim",
        range: 4,
        maxRange: 5.5,
        prepare: 7,
        active: 26,
        recover: 8,
        cooldown: 40,
        style: "contact",
        defaults: { brutal: false, ai: { maxChase: 9, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["facade"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var brutal = !!(config && config.brutal);
            return {
                prepare: p("facade", "prepare", context),
                recover: p("facade", "recover", context) + (brutal ? 2 : 0),
                cooldown: p("facade", "cooldown", context) + (brutal ? 4 : 0),
                range: p("facade", "slam", context)
            };
        },
        windup: function (action, config, prepare) {
            var code = facadeAffliction(action.sense(), action.actor());
            action.present("world_combat:move_facade:brace", facadeScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", affliction: code, tint: facadeTint(code), essence: code > 0 ? 10 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const driveScenes = WorldFeedback.actionScenes(facadeScene);
            const direction = aim(action);
            const length = p("facade", "slam", action);
            const radius = p("facade", "collisionRadius", action);
            let travelled = 0;
            /** 每一刻按“现在身上的异常”重画冲撞色与尾迹量，色相始终跟当前事实一致。 */
            function showDrive(current: CombatAction): void {
                const code = facadeAffliction(current.world(), current.actor());
                const intensity = Math.max(0.5, Math.min(2.2, p("facade", "power", current) / 70));
                driveScenes.show(current, "drive", current.origin(),
                    { moment: "drive", affliction: code, tint: facadeTint(code),
                      essenceRate: code > 0 ? Math.round(10 * intensity) : 0, scale: radius / 0.55 });
            }
            function advance(current: CombatAction): void {
                const body = current.world();
                const origin = current.origin();
                const step = Math.min(p("facade", "chargeSpeed", current), Math.max(0, length - travelled));
                if (step <= 0) { driveScenes.finish(current, done); return; }
                const delta = direction.scale(step);
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const power = p("facade", "power", current);
                    const landed = impact(current, hit, "facade", power, { contact: true });
                    if (landed) {
                        // 命中当刻重新读异常：伤害用的就是这份状态，颜色与它一致；目标已被击杀也照样反馈。
                        const code = facadeAffliction(body, current.actor());
                        const tint = facadeTint(code);
                        const target = hit.target();
                        const point = hit.position(), ref = target === null ? "" : String(target.ref());
                        let targetScale = 1;
                        if (target !== null && body.valid(target)) {
                            body.hitDisplace(target, direction.scale(p("facade", "push", current)));
                            const facts = body.observe(target);
                            if (facts !== null) targetScale = (facts.width() + facts.height()) / 2.3;
                        }
                        const force = Math.max(0.5, Math.min(2.2, power / 70));
                        const at = [point.x(), point.y(), point.z()];
                        WorldFeedback.emit(body, facadeScene, 1, point,
                            { moment: "impact", target: ref, point: at, scale: targetScale,
                              intensity: force, affliction: code, tint: tint,
                              flash: Math.round(14 * force), dust: Math.round(30 * force), grit: Math.round(46 * force),
                              essence: code > 0 ? Math.round(30 * force) : 0 }, 30);
                        WorldFeedback.emit(body, facadeScene, 1, point, { moment: "shove", target: ref, point: at, scale: targetScale }, 22);
                        WorldFeedback.text(body, point, facadeGritText, [], 28);
                        sound(current, "minecraft:entity.player.attack.strong");
                    }
                    if (p("facade", "strain", current) > 0) {
                        const self = body.observe(current.actor());
                        if (self !== null) body.health(current.actor(), -self.maxHealth() * p("facade", "strain", current), "world_combat:facade_strain");
                    }
                    driveScenes.finish(current, done);
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? body.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p("facade", "minimumMove", current) || travelled >= length) {
                    const self = body.observe(current.actor());
                    WorldFeedback.emit(body, facadeScene, 1, self !== null ? self.position() : origin, { moment: "whiff" }, 18);
                    WorldFeedback.text(body, origin, facadeWhiffText, [], 22);
                    sound(current, "minecraft:entity.player.attack.sweep");
                    driveScenes.finish(current, done);
                    return;
                }
                showDrive(current);
                current.after(1, advance);
            }
            showDrive(action);
            advance(action);
        }
    });
}
