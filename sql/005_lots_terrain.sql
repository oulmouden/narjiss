-- Les lotissements vendent des lots de terrain : la typologie ne le prévoyait pas.
ALTER TABLE `lots` MODIFY `typologie` enum('studio','f2','f3','f4','f5','duplex','bureau','commerce','terrain') NOT NULL;
