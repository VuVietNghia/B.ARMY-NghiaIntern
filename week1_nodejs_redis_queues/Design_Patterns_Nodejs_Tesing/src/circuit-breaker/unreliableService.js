class UnreliableService {
    // A mock service that fails approximately 70% of the time
    async fetchData() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const isSuccess = Math.random() > 0.7;
                if (isSuccess) {
                    resolve({ data: "Success Data from Service!" });
                } else {
                    reject(new Error("Service Unavailable (Random Failure)"));
                }
            }, 100); // simulate some network delay
        });
    }
}

module.exports = UnreliableService;
