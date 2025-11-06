const prisma = new PrismaClient();

async function main() {
    // all prisma seed will be here....
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
