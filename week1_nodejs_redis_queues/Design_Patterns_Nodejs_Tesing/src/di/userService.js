class UserService {
    // The logger dependency is injected via the constructor
    constructor(logger) {
        this.logger = logger;
    }

    createUser(username) {
        this.logger.info(`Starting user creation for: ${username}`);
        
        // Simulate user creation logic
        const user = {
            id: Math.floor(Math.random() * 1000),
            username: username
        };

        this.logger.info(`Successfully created user with ID: ${user.id}`);
        return user;
    }
}

module.exports = UserService;
