/**
 * 甩肉 / filletaway 的出手方式。
 *
 * 念头的形状（一幕 + 余韵）：
 *  1) 削——提交后立刻按配置扣除最大生命，把攻击、特攻、速度各提高若干级（`NativeEffects.boost`），
 *     并按体重把若干块血肉沿四周甩进世界（`world.dropItem`，依原生掉落规则自然消失）。
 *  2) 余韵——身上短暂的红光与蒸汽渐隐，表示「更轻了」。
 *
 * 与同族的魂舞烈音爆分开：这是一刀瞬间、只抬进攻三项、把血肉真的甩进世界；魂舞是分拍仪式、抬五项、有声。
 * 提交前只观察并在 `windup` 预告；提交后才触碰世界。
 */
namespace PokemonSkills {
    const filletawayScene = "world_combat:move_filletaway";
    const filletawayText = "world_combat.move.filletaway.text.carve";
    const filletawayWeakText = "world_combat.move.filletaway.text.weak";

    define({
        id: "filletaway",
        name: "Fillet Away",
        description: "一刀削掉自身大量生命，把血肉甩进世界，换取攻击、特攻与速度的大幅提高；生命不足以支付代价并留下保留生命时无法施放。",
        uses: ["开战前把进攻三项拉满再冲", "生命富余时用血换一轮爆发", "在对手接近的空档里把自己削得更快更凶"],
        kind: "self",
        range: 3,
        prepare: 6,
        active: 1,
        recover: 10,
        cooldown: 78,
        style: "carve",
        defaults: { depth: 0.5, ai: { reserveHealth: 0.15, maxChase: 16 } },
        fields: [
            field(pathOf("depth"), "削肉深度", "choice", { options: [
                { value: 0.5, label: "标准" }, { value: 0.65, label: "全力" }] })
        ],
        indicator: function (config) { return { radius: 3, geometry: "area", style: "carve", color: 0xD05A4A, label: "甩肉" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["filletaway"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const deep = !!(config && config.depth && Number(config.depth) > 0.55);
            return {
                prepare: p("filletaway", "prepare", context),
                recover: p("filletaway", "recover", context),
                cooldown: p("filletaway", "cooldown", context) + (deep ? 15 : 0),
                range: 3
            };
        },
        ready: function (action, config) {
            const world = action.sense(), body = world.observe(action.actor());
            if (body === null) return "target-left";
            const reserve = config && config.ai && config.ai.reserveHealth !== undefined ? Number(config.ai.reserveHealth) : 0.15;
            const need = body.maxHealth() * (p("filletaway", "cost", action) + reserve);
            return body.health() <= need ? "insufficient-health" : "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_filletaway:windup", filletawayScene, 1, action.origin(),
                JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const cost = p("filletaway", "cost", action);
            const levels = p("filletaway", "levels", action);
            if (body.health() <= body.maxHealth() * cost) {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), filletawayWeakText, [], 24);
                done(action);
                return;
            }
            const paid = -world.health(actor, -body.maxHealth() * cost, "world_combat:filletaway_cost");
            if (paid < 1) { done(action); return; }
            NativeEffects.boost(world, actor, "atk", levels);
            NativeEffects.boost(world, actor, "spa", levels);
            NativeEffects.boost(world, actor, "spe", levels);
            const chunks = Math.max(1, Math.round(p("filletaway", "chunks", action)));
            const fling = p("filletaway", "fling", action);
            const scatter = p("filletaway", "scatter", action);
            const centre = body.position();
            for (let index = 0; index < chunks; index++) {
                const angle = world.random() * Math.PI * 2, speed = fling * (0.6 + world.random() * 0.5);
                const drop = WorldCombat.point(Math.cos(angle) * scatter * 0.16, 0.55 + world.random() * 0.4, Math.sin(angle) * scatter * 0.16);
                try {
                    world.dropItem(centre.plus(drop), "minecraft:rotten_flesh", 1,
                        JSON.stringify({ pickupDelay: 12, velocity: [Math.cos(angle) * speed, 0.28, Math.sin(angle) * speed] }));
                } catch (error) { /* 掉落物被拒绝时只保留粒子，机制不变 */ }
            }
            WorldFeedback.emit(world, filletawayScene, 1, centre,
                { moment: "carve", scale: scatter / 2, intensity: Math.max(0.4, Math.min(2.5, paid / Math.max(1, body.maxHealth() * 0.5))),
                    chunks: chunks, spread: scatter }, 30);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)), filletawayText, [Math.round(paid), levels], 28);
            world.sound("minecraft:entity.sheep.shear", centre, 18, "{}");
            done(action);
        }
    });
}
