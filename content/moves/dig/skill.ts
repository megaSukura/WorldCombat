/**
 * 挖洞 / Dig — 世界内的动作。
 *
 * 核心念头：钻进地里，绕开地表障碍，在你选定的那一点破土冲出，把范围内的东西连同那块地的表层一起
 * 掀上天。原生“钻地无敌”改由信息与材料承接：落点在起手时锁定并在落点画出范围，准备期就是对手
 * 唯一能走开的窗口；破土的气势取决于脚下是什么——松土掀得又宽又高，石头范围小但更疼，水面或悬空
 * 几乎炸不起来。
 *
 * 形态
 *   - kind "motion"：12 格内选一个落点（不是敌人），施法者准备后消失在原地。
 *   - windup（提交前）：脚边地裂／落点画出范围与预览，可被打断且不花 PP。这是对手走开的窗口。
 *   - dive：等待 burrowTicks 后 teleport 到落点并破土。
 *   - erupt：以落点为心结算范围内所有敌对活体的地面物理伤害（距离衰减）与向上击飞；材料决定破土的
 *     范围、击飞高度与额外伤害，也决定表现用哪种碎屑。破土在地表留下冲击痕：把落点那一层的自然地表
 *     方块换成粗土或碎石这类同位置的冲击方块（world.terrain 租借，replace 盖住原地表），痕迹在战斗中
 *     真实可见、之后自行恢复原样，不掉落物、不永久改地形，也不挖空、不触碰矿石、建材与带方块实体的方块。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（impact → PokemonDamage）与击飞（world.displace）
 * 都走同一条路；只有属性相性/本系是宝可梦层。
 */
namespace PokemonSkills {
    const DIG_SCENE = "world_combat:move_dig";
    const DIG_BASE_PREPARE = 12;
    const DIG_AMBUSH_PREPARE = 18;
    const DIG_AMBUSH_RADIUS = 1.25;
    const DIG_AMBUSH_POWER = 1.1;
    const DIG_AMBUSH_LAUNCH = 1.3;
    const DIG_HARD = ["stone", "deepslate", "cobblestone", "granite", "diorite", "andesite", "tuff", "calcite",
        "basalt", "blackstone", "obsidian", "brick", "concrete", "terracotta", "ore", "iron_block", "gold_block",
        "copper_block", "netherite", "amethyst", "quartz", "prismarine"];
    const DIG_SOFT = ["dirt", "grass_block", "sand", "gravel", "clay", "mud", "soul_sand", "soul_soil", "snow",
        "moss", "podzol", "mycelium", "farmland", "netherrack", "rooted_dirt", "path", "dripstone", "sculk"];

    interface DigMaterial { moment: string; radius: number; launch: number; power: number; scar: string; }

    function digKind(id: string): string {
        var i;
        for (i = 0; i < DIG_HARD.length; i++) if (id.indexOf(DIG_HARD[i]) >= 0) return "hard";
        for (i = 0; i < DIG_SOFT.length; i++) if (id.indexOf(DIG_SOFT[i]) >= 0) return "soft";
        return "neutral";
    }

    /** 清点落点脚下的材料：向下找第一块非空气方块；液体/悬空按最弱的破土处理。材料也决定冲击痕的方块。 */
    function digMaterial(world: CombatWorld, point: CombatPoint): DigMaterial {
        var ground: CombatBlock | null = null;
        for (var dy = 0; dy <= 4 && ground === null; dy++) {
            var block = world.block(point.plus(WorldCombat.point(0, -dy, 0)));
            if (block !== null && block.id().indexOf("air") < 0) ground = block;
        }
        if (ground === null) return { moment: "erupt_wet", radius: 0.6, launch: 0.0, power: 0.7, scar: "" };
        var id = ground.id();
        if (id.indexOf("water") >= 0 || id.indexOf("lava") >= 0) return { moment: "erupt_wet", radius: 0.6, launch: 0.0, power: 0.7, scar: "" };
        var kind = digKind(id);
        if (kind === "hard") return { moment: "erupt_stone", radius: 0.85, launch: 0.8, power: 1.15, scar: "minecraft:cobblestone" };
        if (kind === "soft") return { moment: "erupt", radius: 1.15, launch: 1.25, power: 1.0, scar: "minecraft:coarse_dirt" };
        return { moment: "erupt", radius: 1.0, launch: 1.0, power: 1.0, scar: "minecraft:coarse_dirt" };
    }

    /** 破土能留下冲击痕的自然地表；矿石、建材与带方块实体的方块一律不动。 */
    const DIG_SURFACE = ["dirt", "grass_block", "sand", "gravel", "clay", "mud", "soul_sand", "soul_soil", "snow",
        "moss", "podzol", "mycelium", "farmland", "netherrack", "rooted_dirt", "path", "dripstone",
        "stone", "deepslate", "cobblestone", "granite", "diorite", "andesite", "tuff", "calcite", "basalt",
        "blackstone", "terracotta", "sandstone", "red_sand"];
    /** 冲击痕按自己的寿命存在：够久让人读出这一击落在哪，之后那一层地表恢复原样。 */
    const DIG_SCAR_TICKS = 240;

    function digBreakable(block: CombatBlock): boolean {
        var id = block.id();
        if (id.indexOf("air") >= 0 || id.indexOf("water") >= 0 || id.indexOf("lava") >= 0) return false;
        // 矿石与建材不属于“地表材料”：盖成冲击痕会打扰采集与建筑，直接放过（矿脉里常同时含 stone 子串）。
        if (id.indexOf("ore") >= 0 || id.indexOf("redstone") >= 0 || id.indexOf("brick") >= 0) return false;
        for (var i = 0; i < DIG_SURFACE.length; i++) if (id.indexOf(DIG_SURFACE[i]) >= 0) return true;
        return false;
    }

    /** 从一列顶上找到第一块自然地表，只把这一层换成冲击方块；同一格只记一次。 */
    function digScarColumn(world: CombatWorld, column: CombatPoint, block: string, cells: any[],
        seen: { [key: string]: boolean }): number {
        for (var dy = 0; dy <= 3; dy++) {
            var probe = world.block(column.plus(WorldCombat.point(0, -dy, 0)));
            if (probe === null || !digBreakable(probe)) continue;
            var pos = probe.position(), key = pos.x() + "," + pos.y() + "," + pos.z();
            if (seen[key]) return 0;
            seen[key] = true;
            cells.push({ x: pos.x(), y: pos.y(), z: pos.z(), block: block });
            return 1;
        }
        return 0;
    }

    /**
     * 破土在地表留下一圈冲击痕：以爆心为轴，把落点那一层换成粗土／碎石，并在约六成半径的环上选几个
     * 方向做同样的替换。全部走 world.terrain 的租约——replace 盖住原地表、linger 让它活过招式本身，
     * 按自己的寿命到期后原方块自己回来；不掉落物、不挖空、不永久改地形，数量按材料封顶。
     */
    function digScar(world: CombatWorld, center: CombatPoint, radius: number, material: DigMaterial): number {
        if (!material.scar) return 0;
        var budget = material.moment === "erupt_stone" ? 6 : 9, done = 0;
        var cells: any[] = [], seen: { [key: string]: boolean } = Object.create(null);
        done += digScarColumn(world, center, material.scar, cells, seen);
        var ring = Math.max(1, Math.round(radius * 0.6));
        for (var i = 0; i < 8 && done < budget; i++) {
            var angle = i / 8 * Math.PI * 2;
            var ringAt = center.plus(WorldCombat.point(Math.cos(angle) * ring, 0, Math.sin(angle) * ring));
            done += digScarColumn(world, ringAt, material.scar, cells, seen);
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), DIG_SCAR_TICKS); }
        catch (error) { return 0; }
        return cells.length;
    }

    function digErupt(current: CombatAction, move: CombatPokemonMove, config: any, destination: CombatPoint, done: (current: CombatAction) => void): void {
        var id = "dig", world = current.world(), actor = current.actor();
        var ambush = !!config.ambush;
        var material = digMaterial(world, destination);
        var radius = p(id, "eruptionRadius", current) * (ambush ? DIG_AMBUSH_RADIUS : 1) * material.radius;
        var power = p(id, "power", current) * (ambush ? DIG_AMBUSH_POWER : 1) * material.power;
        var launch = p(id, "launch", current) * (ambush ? DIG_AMBUSH_LAUNCH : 1) * material.launch;
        var collision = p(id, "collisionRadius", current);
        var maxTargets = p(id, "maxTargets", current);

        if (!world.teleport(actor, destination)) {
            var self = world.observe(actor);
            if (self !== null) world.displace(actor, destination.minus(self.position()));
        }
        var center = destination.plus(WorldCombat.point(0, 0.2, 0)), actors = world.query(center, radius, false), hits = 0;
        for (var i = 0; i < actors.length && hits < maxTargets; i++) {
            var target = actors[i];
            if (String(target.ref()) === String(actor.ref()) || world.friendly(target)) continue;
            var observed = world.observe(target);
            if (observed === null) continue;
            var distance = observed.position().minus(center).length();
            if (distance > radius || !world.clear(center, observed.position())) continue;
            // 破土常把目标掀在爆心正上方；从目标头顶向下取线，避免在目标碰撞箱内部起线而取不到命中。
            var overhead = observed.position().plus(WorldCombat.point(0, Math.max(1.2, observed.height() + 0.5), 0));
            var hit = current.trace(overhead, observed.position(), collision);
            if (!hit.hitEntity() || hit.target() === null || String(hit.target()!.ref()) !== String(target.ref())) continue;
            var landed = impact(current, hit, id, power * Math.max(0.5, 1 - distance / radius * 0.5));
            if (!landed) continue;
            if (world.valid(target) && launch > 0) world.displace(target, WorldCombat.point(0, launch, 0));
            hits += 1;
        }
        WorldFeedback.emit(world, DIG_SCENE, 1, center, { moment: material.moment, scale: radius / 2.6, intensity: 1 + Math.min(1.5, hits * 0.4) }, 50);
        digScar(world, center, radius, material);
        WorldFeedback.emit(world, DIG_SCENE, 1, center, { moment: "settle", scale: radius / 2.6, intensity: 1 + Math.min(1, hits * 0.25) }, 34);
        sound(current, "minecraft:entity.ravager.stunned");
        done(current);
    }

    define({
        freeMovement: true,
        id: "dig", name: "挖洞",
        description: "钻入地下、绕开地表障碍，在选定落点破土：范围内敌人受到地面伤害并被掀飞，落点那一层地表被换成粗土或碎石、留下冲击痕，之后自行恢复。落点材料决定破土范围、击飞高度与附加伤害。",
        uses: ["位移突袭", "范围击飞", "绕后攻击"],
        kind: "motion", range: 12, active: 10, style: "ground-burrow", maximumTicks: 180,
        defaults: { ambush: false },
        fields: [field(pathOf("ambush"), "伏击", "boolean", { help: "多花 6 刻准备，破土范围、威力与击飞高度都提高，冷却更长；更容易被读懂。" })],
        resolve: function (_pokemon, config) {
            return { prepare: config.ambush ? DIG_AMBUSH_PREPARE : DIG_BASE_PREPARE, recover: 6, cooldown: config.ambush ? 70 : 48 };
        },
        windup: function (action, config) {
            var sense = action.sense(), body = sense.observe(action.actor()), destination = action.targetPosition();
            var material = digMaterial(sense, destination);
            var radius = p("dig", "eruptionRadius", action) * (config.ambush ? DIG_AMBUSH_RADIUS : 1) * material.radius;
            action.present("dig-mark", DIG_SCENE, 1, destination.plus(WorldCombat.point(0, 0.03, 0)), JSON.stringify({ moment: "mark", scale: radius / 2.6 }));
            if (body) action.present("dig-cracks", DIG_SCENE, 1, body.position(), JSON.stringify({ moment: "windup" }));
            return config.ambush ? DIG_AMBUSH_PREPARE : DIG_BASE_PREPARE;
        },
        execute: function (action, move, config, done) {
            var world = action.world(), body = world.observe(action.actor()), destination = action.targetPosition();
            if (body === null) { done(action); return; }
            sound(action, "minecraft:block.sand.break");
            WorldFeedback.emit(world, DIG_SCENE, 1, body.position(), { moment: "dive" }, 30);
            action.after(p("dig", "burrowTicks", action), function (current) { digErupt(current, move, config, destination, done); });
        }
    });

    WorldCombat.preview("world_combat:dig", JSON.stringify({ motion: "horizontal" }));
}
