/**
 * 秘密之力 / secretpower —— 注册与动作。
 *
 * 一幕借力（提交前 `windup` 在选中落点读出当前场所，并用少量可辨物料预告），一幕突进（提交后沿瞄准
 * 方向的水平分量贴近目标，遇首个敌人或墙面收势），一幕命中（在目标脚下重新取样方块/流体/天气，把材料变成追加
 * 状态：火→灼伤、草木→睡眠、水/雨→麻痹，其余或直击形态→麻痹），落空/撞墙只扬尘。命中后按体重顶开。
 * 状态经共享 `impact(...,{status,chance})` 落到任何活体；宝可梦的原生异常由共享库镜像，本单元不碰。
 *
 * kind 为 aim：可瞄准目标，也可只朝一个方向短冲（空放不结算伤害）；攻击权限由命中层控制。
 */
namespace PokemonSkills {
    const SECRETPOWER_SCENE = "world_combat:move_secretpower";
    const SECRETPOWER_TEXT: { [site: string]: string } = {
        plain: "world_combat.move.secretpower.text.plain",
        fire: "world_combat.move.secretpower.text.fire",
        thicket: "world_combat.move.secretpower.text.thicket",
        water: "world_combat.move.secretpower.text.water"
    };

    function secretpowerFire(id: string): boolean {
        return id.indexOf("fire") >= 0 || id.indexOf("lava") >= 0 || id.indexOf("magma") >= 0 || id.indexOf("campfire") >= 0;
    }

    function secretpowerGreen(id: string, block: CombatBlock | null): boolean {
        var parts = ["grass", "leaves", "fern", "flower", "moss", "vine", "crop", "sapling", "azalea", "bush", "lily", "mushroom", "wheat", "carrot", "potato", "beetroot", "melon", "pumpkin", "cactus", "bamboo", "kelp", "seagrass"];
        for (var i = 0; i < parts.length; i++)
            if (id.indexOf(parts[i]) >= 0)
                return true;
        return !!block && (block.tagged("minecraft:leaves") || block.tagged("minecraft:flowers") || block.tagged("minecraft:small_flowers")
            || block.tagged("minecraft:crops") || block.tagged("minecraft:saplings") || block.tagged("minecraft:replaceable_plants"));
    }

    /** 读出命中点脚下的场所：注册表 tag 优先，既有 id 映射兜底，水/雨、火焰、草木，其余为普通地面。 */
    export function secretpowerSite(world: CombatWorld, point: CombatPoint): string {
        var block = world.block(point), id = block ? String(block.id()) : "";
        var fluid = world.fluid(point);
        if (fluid && !fluid.empty() && (fluid.tagged("minecraft:water") || fluid.tagged("c:water") || String(fluid.id()).indexOf("water") >= 0))
            return "water";
        if (block && (block.tagged("minecraft:fire") || block.tagged("minecraft:campfires")))
            return "fire";
        if (block && (block.tagged("minecraft:leaves") || block.tagged("minecraft:flowers") || block.tagged("minecraft:small_flowers")
            || block.tagged("minecraft:crops") || block.tagged("minecraft:saplings") || block.tagged("minecraft:replaceable_plants")))
            return "thicket";
        if (secretpowerFire(id))
            return "fire";
        if (secretpowerGreen(id, block))
            return "thicket";
        var environment = WorldEnvironment.read(world, point);
        if (environment && environment.rainingAt)
            return "water";
        return "plain";
    }

    export function secretpowerStatus(site: string): string {
        if (site === "fire") return "burn";
        if (site === "thicket") return "sleep";
        return "paralysis";
    }

    function secretpowerHint(site: string): { fire: number; thicket: number; water: number } {
        return { fire: site === "fire" ? 14 : 0, thicket: site === "thicket" ? 14 : 0, water: site === "water" ? 14 : 0 };
    }

    function secretpowerHit(current: CombatAction, hit: CombatImpact, plain: boolean, direction: CombatPoint, power: number): void {
        var world = current.world(), target = hit.target();
        if (target === null)
            return;
        var body = world.observe(target);
        if (!body)
            return;
        var centre = body.position(), foot = WorldCombat.point(centre.x(), centre.y() - 1, centre.z());
        var site = secretpowerSite(world, foot);
        var status = plain ? "paralysis" : secretpowerStatus(site);
        var chance = p("secretpower", "chance", current);
        if (!plain && site === "water")
            chance = Math.min(0.95, chance * 2);
        var before = body.health(), maximum = Math.max(1, body.maxHealth());
        var beforeEffect = CombatStatus.representative(world, target, status, true);
        var landed = impact(current, hit, "secretpower", power, { contact: true, status: status, chance: chance });
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var afterEffect = world.valid(target) ? CombatStatus.representative(world, target, status, true) : null;
        var applied = !!(afterEffect && (!beforeEffect || String(afterEffect.key()) !== String(beforeEffect.key())));
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        world.sound("minecraft:entity.player.attack.knockback", centre, 16, "{}");
        WorldFeedback.emit(world, SECRETPOWER_SCENE, 1, centre,
            { moment: plain ? "plain" : site, target: String(target.ref()), intensity: intensity, applied: applied ? 1 : 0,
                mark: applied ? 12 : 0, status: status, bursts: Math.round(6 + intensity * 6) }, 34);
        if (applied)
            WorldFeedback.text(world, centre, SECRETPOWER_TEXT[plain ? "plain" : site], [], 40);
        if (landed && world.valid(target))
            world.hitDisplace(target, direction.scale(p("secretpower", "push", current)));
    }

    function secretpowerStrike(action: CombatAction, plain: boolean, done: (current: CombatAction) => void): void {
        const movementScenes = WorldFeedback.actionScenes(SECRETPOWER_SCENE);
        var aimed = aim(action), flat = WorldCombat.point(aimed.x(), 0, aimed.z());
        var direction = flat.length() > 0.001 ? flat.unit() : WorldCombat.point(0, 0, 1);
        var power = p("secretpower", "power", action);
        movementScenes.show(action, "travel", action.origin(), { moment: "travel", intensity: 1, scale: 1 });
        var travelled = 0, length = p("secretpower", "distance", action);
        function advance(current: CombatAction): void {
            var world = current.world(), origin = current.origin(),
                delta = direction.scale(Math.min(p("secretpower", "speed", current), length - travelled));
            var swept = sweepStep(current, delta, p("secretpower", "collisionRadius", current));
            var hit = swept.hit;
            if (hit.hitEntity()) {
                secretpowerHit(current, hit, plain, direction, power);
                movementScenes.finish(current, done);
                return;
            }
            var moved = swept.moved;
            travelled += moved;
            if (hit.blocked() || moved < p("secretpower", "minimumMove", current) || travelled >= length) {
                movementScenes.show(current, "travel", hit.position(), { moment: "travel", intensity: 1, scale: 1 });
                movementScenes.finish(current, done);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true, id: "secretpower", name: "秘密之力",
        description: "借命中处场所之力的一记短击：火焰引燃、草木催眠、水与雨导电麻痹，其余则概率麻痹；直击形态无视场所换取更高威力。可瞄准目标，也可只朝一个方向空冲。",
        uses: ["近身借力", "环境利用"], kind: "aim", range: 5, prepare: 6, active: 0, recover: 8, cooldown: 26, style: "site",
        defaults: { plain: false }, fields: [flag("plain", "直击形态")],
        indicator: function () { return { radius: 5, geometry: "line", style: "site", label: "秘密之力" }; },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            var plain = config && config.plain === true, site = "plain";
            try { site = secretpowerSite(action.sense(), action.targetPosition()); } catch (error) { site = "plain"; }
            var hint = plain ? { fire: 0, thicket: 0, water: 0 } : secretpowerHint(site);
            action.present("world_combat:secretpower:" + action.id(), SECRETPOWER_SCENE, 1, action.origin(),
                JSON.stringify({ moment: "windup", plain: plain, site: plain ? "plain" : site,
                    hintFire: hint.fire, hintThicket: hint.thicket, hintWater: hint.water }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            secretpowerStrike(action, config && config.plain === true, done);
        }
    });
}
