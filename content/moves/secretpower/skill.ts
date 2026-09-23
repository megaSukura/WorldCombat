/**
 * 秘密之力 / secretpower —— 注册与动作。
 *
 * 一幕借力（提交前 `windup` 在脚边吸材料），一幕突进（提交后沿瞄准方向贴近目标），
 * 一幕命中（读到命中点的方块/流体/天气，把材料变成追加状态：火→灼伤、草木→睡眠、水/雨→麻痹，
 * 其余或直击形态→麻痹），落空/撞墙只扬尘。命中后按体重顶开。状态经共享 `impact(...,{status,chance})`
 * 落到任何活体；宝可梦的原生异常由共享库镜像，本单元不碰。
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

    /** 读出命中点脚下的场所：水/雨、火焰、草木，其余为普通地面。 */
    function secretpowerSite(world: CombatWorld, point: CombatPoint): string {
        var block = world.block(point), id = block ? String(block.id()) : "";
        var fluid = world.fluid(point);
        if (fluid && !fluid.empty() && (fluid.tagged("minecraft:water") || String(fluid.id()).indexOf("water") >= 0))
            return "water";
        if (secretpowerFire(id))
            return "fire";
        if (secretpowerGreen(id, block))
            return "thicket";
        var environment = WorldEnvironment.read(world, point);
        if (environment && environment.rainingAt)
            return "water";
        return "plain";
    }

    function secretpowerStatus(site: string): string {
        if (site === "fire") return "burn";
        if (site === "thicket") return "sleep";
        return "paralysis";
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
        var landed = impact(current, hit, "secretpower", power, { contact: true, status: status, chance: chance });
        var after = world.valid(target) ? world.observe(target) : null, dealt = before - (after ? after.health() : 0);
        var intensity = Math.max(1, Math.min(3, 1 + dealt / maximum * 4));
        world.sound("minecraft:entity.player.attack.knockback", centre, 16, "{}");
        WorldFeedback.emit(world, SECRETPOWER_SCENE, 1, centre,
            { moment: plain ? "plain" : site, target: String(target.ref()), intensity: intensity, bursts: Math.round(6 + intensity * 6) }, 34);
        WorldFeedback.text(world, centre, SECRETPOWER_TEXT[plain ? "plain" : site], [], 40);
        if (landed && world.valid(target))
            world.displace(target, direction.scale(p("secretpower", "push", current)));
    }

    function secretpowerStrike(action: CombatAction, plain: boolean, done: (current: CombatAction) => void): void {
        var direction = aim(action), power = p("secretpower", "power", action);
        WorldFeedback.emit(action.world(), SECRETPOWER_SCENE, 1, action.origin(), { moment: "travel", intensity: 1, scale: 1 }, 20);
        var travelled = 0, length = p("secretpower", "distance", action);
        function advance(current: CombatAction): void {
            var world = current.world(), origin = current.origin(),
                delta = direction.scale(Math.min(p("secretpower", "speed", current), length - travelled));
            var hit = current.trace(origin, origin.plus(delta.scale(p("secretpower", "traceAhead", current))), p("secretpower", "collisionRadius", current));
            if (hit.hitEntity()) {
                secretpowerHit(current, hit, plain, direction, power);
                done(current);
                return;
            }
            var moved = world.displace(current.actor(), delta);
            travelled += moved;
            if (hit.blocked() || moved < p("secretpower", "minimumMove", current) || travelled >= length) {
                WorldFeedback.emit(world, SECRETPOWER_SCENE, 1, hit.position(), { moment: "travel", intensity: 1, scale: 1 }, 12);
                done(current);
                return;
            }
            current.after(1, advance);
        }
        advance(action);
    }

    define({
        freeMovement: true, id: "secretpower", name: "秘密之力",
        description: "借脚下场所之力的一记短击：火焰引燃、草木催眠、水与雨导电麻痹，其余则概率麻痹；直击形态无视场所换取更高威力。",
        uses: ["近身借力", "环境利用"], kind: "enemy", range: 5, prepare: 6, active: 0, recover: 8, cooldown: 26, style: "site",
        defaults: { plain: false }, fields: [flag("plain", "直击形态")],
        indicator: function () { return { radius: 5, geometry: "line", style: "site", label: "秘密之力" }; },
        windup: function (action: CombatAction, config: any, prepare: number): number {
            action.present("world_combat:secretpower:" + action.id(), SECRETPOWER_SCENE, 1, action.origin(),
                JSON.stringify({ moment: "windup", plain: config && config.plain === true }));
            return prepare;
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            secretpowerStrike(action, config && config.plain === true, done);
        }
    });
}
