/**
 * 瞬间移动 / teleport 的出手方式。
 *
 * 核心念头：折叠空间，把自己从原地瞬间挪到选定的落点，顺手甩掉正盯着自己的敌人——「我在这儿」和「我不在这儿」
 *   发生在同一瞬间。这是这一族里最纯粹的一招：不撞、不留东西、不给等级，只把自己搬走。
 *
 * 两幕：
 *   起（fold，提交前）：脚边空间裂开一圈冷光，只播预告。
 *   闪（depart → arrive，提交后）：先让 `shedRadius` 内盯着自己的敌人失去目标，再瞬移到落点；
 *     野生的个体（`F.individual("wild")`）挪得更远，并松开自己手里的目标（逃走）。
 *
 * 与同族分开：接棒把等级递给别人、急速折返撞一下再走、断尾留物引敌；只有瞬间移动**不留任何东西**，
 *   落点由玩家选（motion），是可反复使用（冷却短）的脱身。
 * 提交前只观察、只 present；位移与粒子都在提交后写。
 */
namespace PokemonSkills {
    /** 是否为野生个体（只有宝可梦有这个概念；其他生物当作非野生）。 */
    function teleportWild(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        return !!CobblemonCombat.pokemon(actor).wild();
    }

    define({
        freeMovement: true,
        id: teleportId,
        cooldownParameter: "recharge",
        name: "Teleport",
        description: "折叠空间瞬移到选定的落点，甩掉盯着自己的敌人；野生的个体挪得更远并松开自己的目标。不留任何东西，冷却短。",
        uses: ["被贴住时瞬间拉开距离", "甩掉正盯着自己的追兵", "越过一小段地形挪到安全处"],
        kind: "motion",
        range: 9,
        maxRange: 20,
        prepare: 4,
        active: 0,
        recover: 5,
        cooldown: 60,
        style: "blink",
        defaults: { far: false, ai: { retreatBelow: 0.35, maxChase: 14, leaveStation: false } },
        fields: [flag("far", "远遁闪")],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[teleportId], detail: { values: config } };
            return {
                radius: p(teleportId, "blinkRange", context), geometry: "line", style: "blink", color: 0x8AB6FF,
                label: config && config.far ? "瞬间移动·远遁" : "瞬间移动"
            };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[teleportId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(teleportId, "tempo", context)),
                recover: Math.round(p(teleportId, "aftercast", context)),
                cooldown: Math.round(p(teleportId, "recharge", context)),
                active: 0,
                range: p(teleportId, "blinkRange", context)
            };
        },
        ready: function (action) {
            return action.targetPosition().minus(action.origin()).length() < 0.1 ? "invalid-target" : "";
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_teleport:fold", teleportScene, 1, action.origin(),
                JSON.stringify({ moment: "fold", far: config && config.far ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const origin = body.position();
            const range = p(teleportId, "blinkRange", action);
            const shedRadius = p(teleportId, "shedRadius", action);
            const motes = Math.max(8, Math.round(p(teleportId, "motes", action)));
            const wild = teleportWild(world, self);
            const scale = Math.max(0.6, Math.min(1.8, motes / 24));
            const chosen = action.targetPosition();
            const flat = WorldCombat.point(chosen.x() - origin.x(), 0, chosen.z() - origin.z());
            const direction = flat.length() < 0.01 ? action.direction() : flat.unit();
            const reach = Math.min(flat.length() < 0.01 ? range : flat.length(), range);
            const feet = WorldCombat.point(origin.x(), origin.y() - body.height() / 2, origin.z());
            const destination = feet.plus(direction.scale(reach));

            // 先甩掉盯着自己的敌人，再闪走：画面里「失去目标」发生在离开之前。
            let shed = 0;
            const near = world.query(origin, shedRadius, false);
            for (let index = 0; index < near.length; index++) {
                const other = near[index];
                if (String(other.ref()) === String(self.ref()) || world.friendly(other)) continue;
                const facts = world.observe(other);
                if (facts === null || facts.health() <= 0) continue;
                const chasing = facts.attacking();
                if (chasing === null || String(chasing.ref()) !== String(self.ref())) continue;
                if (world.target(other, null)) shed++;
            }

            const moved = world.teleport(self, destination) ? reach : world.displace(self, destination.minus(origin));
            const landed = world.observe(self);
            const at = landed === null ? destination : landed.position();
            WorldFeedback.emit(world, teleportScene, 1, origin,
                { moment: "depart", motes: motes, sheared: shed, wild: wild ? 1 : 0, scale: scale }, 22);
            WorldFeedback.emit(world, teleportScene, 1, at,
                { moment: "arrive", motes: motes, sheared: shed, wild: wild ? 1 : 0,
                    intensity: Math.max(0.7, Math.min(2, 0.7 + shed / 3)), scale: scale }, 24);
            if (wild) world.target(self, null);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), wild ? teleportWildText : teleportText,
                [Math.round(moved * 10) / 10], 26);
            world.sound("minecraft:entity.enderman.teleport", origin, 16, "{}");
            world.sound("minecraft:entity.player.teleport", at, 12, "{}");
            done(action);
        }
    });
}
